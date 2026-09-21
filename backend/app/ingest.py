from __future__ import annotations

import io
import logging
import re
import uuid

from fastapi import HTTPException, UploadFile
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.config import get_settings
from app.db import (
    count_documents,
    delete_expired_documents,
    delete_expired_messages,
    get_conn,
    insert_document,
)
from app.llm import embed
from app.security import is_injection, sanitize_text
from app.vectorstore import _get_collection, add_chunks

logger = logging.getLogger(__name__)

_MAX_TOTAL_CHARS = 500_000

_PARA_RE = re.compile(r"\n\n+")
_SENTENCE_END_RE = re.compile(r"(?<=[.!?])\s+")


def _split_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    """
    Split text into chunks of at most chunk_size characters, with chunk_overlap
    carried over between adjacent chunks. Prefers paragraph then sentence
    boundaries over hard character cuts.
    """
    paragraphs = [p.strip() for p in _PARA_RE.split(text) if p.strip()]
    if not paragraphs:
        return []

    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        if len(para) > chunk_size:
            sentences = _SENTENCE_END_RE.split(para)
            for sent in sentences:
                if len(current) + len(sent) + 1 <= chunk_size:
                    current = (current + " " + sent).strip() if current else sent
                else:
                    if current:
                        chunks.append(current)
                    while len(sent) > chunk_size:
                        chunks.append(sent[:chunk_size])
                        sent = sent[chunk_size - chunk_overlap:]
                    current = sent
        else:
            if len(current) + len(para) + 2 <= chunk_size:
                current = (current + "\n\n" + para).strip() if current else para
            else:
                if current:
                    chunks.append(current)
                overlap_text = current[-chunk_overlap:] if chunk_overlap else ""
                current = (overlap_text + "\n\n" + para).strip() if overlap_text else para

    if current:
        chunks.append(current)

    return chunks


def _read_pdf(data: bytes) -> tuple[list[str], int]:
    """
    Extract per-page sanitized text from PDF bytes.
    Returns (page_texts, total_page_count).
    Raises HTTPException on corrupt, encrypted, or oversized PDFs.
    """
    try:
        reader = PdfReader(io.BytesIO(data))
    except PdfReadError as exc:
        raise HTTPException(status_code=400, detail="Invalid or corrupted PDF") from exc

    if reader.is_encrypted:
        raise HTTPException(status_code=400, detail="Encrypted PDFs are not supported")

    settings = get_settings()
    pages = reader.pages
    if len(pages) > settings.max_pdf_pages:
        raise HTTPException(
            status_code=400,
            detail=f"PDF exceeds maximum of {settings.max_pdf_pages} pages",
        )

    page_texts: list[str] = []
    total_chars = 0
    for page in pages:
        text = sanitize_text(page.extract_text() or "")
        total_chars += len(text)
        if total_chars > _MAX_TOTAL_CHARS:
            overage = total_chars - _MAX_TOTAL_CHARS
            text = text[: max(0, len(text) - overage)]
            page_texts.append(text)
            break
        page_texts.append(text)

    return page_texts, len(pages)


def _sanitize_filename(raw: str) -> str:
    """Return a safe display name: last path component, no control chars, max 100 chars."""
    name = re.split(r"[/\\]", raw)[-1]
    name = re.sub(r"[\x00-\x1f\x7f]", "", name).strip()
    return name[:100] if name else "document.pdf"


def _run_retention() -> None:
    """Purge expired documents and messages from Postgres and their chunks from Chroma."""
    settings = get_settings()
    with get_conn() as conn:
        expired_ids = delete_expired_documents(conn, ttl_hours=settings.document_ttl_hours)
        delete_expired_messages(conn, ttl_hours=settings.document_ttl_hours)
        conn.commit()

    if not expired_ids:
        return

    col = _get_collection()
    for doc_id in expired_ids:
        try:
            col.delete(where={"document_id": {"$eq": str(doc_id)}})
        except Exception as exc:
            logger.warning("Chroma retention failed for doc %s: %s", doc_id, exc)

    logger.info("Retention: purged %d expired document(s)", len(expired_ids))


def ingest_upload(
    file: UploadFile,
    session_id: uuid.UUID,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> dict:
    """
    Validate, extract, chunk, embed, and store an uploaded PDF.
    Returns {id, name, pages, chunks}.
    The file body is read from the underlying sync file object and never written to disk.
    """
    settings = get_settings()
    cs = chunk_size if chunk_size is not None else settings.chunk_size
    co = chunk_overlap if chunk_overlap is not None else settings.chunk_overlap
    max_bytes = settings.max_upload_bytes

    # UploadFile.file is a SpooledTemporaryFile; read it in chunks to enforce the limit.
    data = b""
    buf = file.file
    while True:
        block = buf.read(65536)
        if not block:
            break
        data += block
        if len(data) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"Upload exceeds maximum of {settings.max_upload_mb} MB",
            )

    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="File is not a valid PDF")

    with get_conn() as conn:
        count = count_documents(conn, session_id=session_id)
    if count >= settings.max_docs_per_session:
        raise HTTPException(
            status_code=400,
            detail=f"Session already holds {settings.max_docs_per_session} documents",
        )

    page_texts, page_count = _read_pdf(data)

    doc_id = uuid.uuid4()
    safe_name = _sanitize_filename(file.filename or "document.pdf")

    chunk_ids: list[str] = []
    texts: list[str] = []
    metadatas: list[dict] = []
    flagged_count = 0

    for page_num, page_text in enumerate(page_texts, start=1):
        if not page_text.strip():
            continue
        for chunk_text in _split_text(page_text, cs, co):
            flagged = is_injection(chunk_text)
            if flagged:
                flagged_count += 1
            chunk_ids.append(str(uuid.uuid4()))
            texts.append(chunk_text)
            metadatas.append(
                {
                    "session_id": str(session_id),
                    "document_id": str(doc_id),
                    "document_name": safe_name,
                    "page": page_num,
                    "flagged": flagged,
                }
            )

    if not texts:
        raise HTTPException(status_code=400, detail="PDF contains no extractable text")

    embeddings = embed(texts, task_type="RETRIEVAL_DOCUMENT")

    add_chunks(ids=chunk_ids, embeddings=embeddings, documents=texts, metadatas=metadatas)

    with get_conn() as conn:
        insert_document(
            conn,
            doc_id=doc_id,
            session_id=session_id,
            name=safe_name,
            pages=page_count,
            chunk_count=len(chunk_ids),
        )
        conn.commit()

    _run_retention()

    if flagged_count:
        logger.warning(
            "doc=%s session=%s flagged %d/%d chunks",
            doc_id,
            session_id,
            flagged_count,
            len(chunk_ids),
        )

    return {
        "id": str(doc_id),
        "name": safe_name,
        "pages": page_count,
        "chunks": len(chunk_ids),
    }
