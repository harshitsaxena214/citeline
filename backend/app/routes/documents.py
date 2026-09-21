import logging
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Request, UploadFile
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings
from app.db import delete_document, get_conn, list_documents
from app.ingest import ingest_upload
from app.vectorstore import delete_by_document

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])

# Limiter instance is shared with app.state.limiter via SlowAPIMiddleware.
# We instantiate here with the same key_func so decorators resolve correctly.
limiter = Limiter(key_func=get_remote_address)


def _require_session(x_session_id: str | None = Header(default=None)) -> uuid.UUID:
    if not x_session_id:
        raise HTTPException(status_code=400, detail="X-Session-Id header missing")
    try:
        return uuid.UUID(x_session_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="X-Session-Id must be a valid UUID",
        )


@router.post("", status_code=201)
@limiter.limit(get_settings().rate_limit_upload)
def upload_document(
    request: Request,
    file: UploadFile,
    session_id: uuid.UUID = Depends(_require_session),
):
    """Upload a PDF. Multipart field name: file. Returns {id, name, pages, chunks}."""
    result = ingest_upload(file, session_id)
    logger.info("Uploaded doc=%s session=%s", result["id"], session_id)
    return result


@router.get("")
def list_documents_route(
    session_id: uuid.UUID = Depends(_require_session),
):
    """List all documents for this session, newest first."""
    with get_conn() as conn:
        docs = list_documents(conn, session_id=session_id)

    return [
        {
            "id": str(d["id"]),
            "name": d["name"],
            "pages": d["pages"],
            "chunk_count": d["chunk_count"],
            "created_at": d["created_at"].isoformat(),
        }
        for d in docs
    ]


@router.delete("/{doc_id}", status_code=204)
def delete_document_route(
    doc_id: str,
    session_id: uuid.UUID = Depends(_require_session),
):
    """Delete a document and its Chroma chunks. 404 if not owned by this session."""
    try:
        doc_uuid = uuid.UUID(doc_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="doc_id must be a valid UUID",
        )

    with get_conn() as conn:
        deleted = delete_document(
            conn,
            doc_id=doc_uuid,
            session_id=session_id,
        )

        if not deleted:
            raise HTTPException(
                status_code=404,
                detail="Document not found",
            )

        conn.commit()

    delete_by_document(
        document_id=doc_uuid,
        session_id=session_id,
    )

    logger.info(
        "Deleted doc=%s session=%s",
        doc_id,
        session_id,
    )