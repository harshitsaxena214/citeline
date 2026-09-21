"""
Offline evaluation script.

Usage:
    python -m evals.run_eval \\
        --pdf PATH \\
        --questions evals/questions.json \\
        --chunk-sizes 500 1000 \\
        --delay 2

questions.json format: [{"question": "...", "expected_page": 3}, ...]

For each chunk size the script:
  1. Ingests the PDF into a fresh random session.
  2. Runs QA directly (skips the router) for each question.
  3. Deletes all session data from Postgres and Chroma.
  4. Reports retrieval hit rate, supported share, and average latency.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from pathlib import Path

# Bootstrap env before any app import.
from app.config import get_settings  # noqa: E402 — triggers fail-fast on missing vars

from app.db import (
    apply_schema,
    close_pool,
    delete_expired_documents,
    get_conn,
    insert_document,
    open_pool,
)
from app.ingest import _read_pdf, _split_text
from app.llm import embed
from app.rag import answer_qa
from app.security import is_injection
from app.vectorstore import _get_collection, add_chunks, delete_by_document, init_chroma


def _ingest_for_eval(
    pdf_path: Path,
    session_id: uuid.UUID,
    chunk_size: int,
    chunk_overlap: int,
) -> tuple[str, int]:
    """Ingest a PDF file for evaluation. Returns (doc_id_str, chunk_count)."""
    data = pdf_path.read_bytes()
    page_texts, page_count = _read_pdf(data)

    doc_id = uuid.uuid4()
    safe_name = pdf_path.name[:100]

    chunk_ids: list[str] = []
    texts: list[str] = []
    metadatas: list[dict] = []

    for page_num, page_text in enumerate(page_texts, start=1):
        if not page_text.strip():
            continue
        for chunk_text in _split_text(page_text, chunk_size, chunk_overlap):
            flagged = is_injection(chunk_text)
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
        print("ERROR: PDF contains no extractable text", file=sys.stderr)
        sys.exit(1)

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

    return str(doc_id), len(chunk_ids)


def _cleanup(session_id: uuid.UUID, doc_id: str) -> None:
    """Remove all data for this evaluation session."""
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM documents WHERE session_id = %s", (str(session_id),)
        )
        conn.execute(
            "DELETE FROM messages WHERE session_id = %s", (str(session_id),)
        )
        conn.commit()

    col = _get_collection()
    col.delete(where={"session_id": {"$eq": str(session_id)}})


def _run_chunk_size(
    pdf_path: Path,
    questions: list[dict],
    chunk_size: int,
    delay: float,
) -> dict:
    settings = get_settings()
    chunk_overlap = settings.chunk_overlap
    session_id = uuid.uuid4()

    print(f"\n[chunk_size={chunk_size}] Ingesting {pdf_path.name} …")
    doc_id_str, chunk_count = _ingest_for_eval(pdf_path, session_id, chunk_size, chunk_overlap)
    doc_id = uuid.UUID(doc_id_str)
    print(f"  Ingested: {chunk_count} chunks, doc_id={doc_id_str}")

    hits = 0
    supported_count = 0
    latencies: list[float] = []

    for i, q in enumerate(questions):
        question = q["question"]
        expected_page = q.get("expected_page")

        t0 = time.perf_counter()
        result = answer_qa(question, session_id, [doc_id])
        elapsed = time.perf_counter() - t0
        latencies.append(elapsed)

        retrieved_pages = {c["page"] for c in result["citations"]}
        hit = expected_page is not None and expected_page in retrieved_pages
        if hit:
            hits += 1
        if result["supported"]:
            supported_count += 1

        print(
            f"  Q{i+1}: hit={hit} supported={result['supported']} "
            f"pages={sorted(retrieved_pages)} latency={elapsed:.2f}s"
        )

        if delay > 0 and i < len(questions) - 1:
            time.sleep(delay)

    _cleanup(session_id, doc_id_str)

    n = len(questions)
    return {
        "chunk_size": chunk_size,
        "hit_rate": hits / n if n else 0,
        "supported_share": supported_count / n if n else 0,
        "avg_latency_s": sum(latencies) / len(latencies) if latencies else 0,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="RAG evaluation script")
    parser.add_argument("--pdf", required=True, help="Path to PDF file to ingest")
    parser.add_argument(
        "--questions",
        default="evals/questions.json",
        help="Path to questions.json",
    )
    parser.add_argument(
        "--chunk-sizes",
        nargs="+",
        type=int,
        default=[1000],
        help="Chunk sizes to evaluate",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=2.0,
        help="Seconds to pause between questions (rate limit buffer)",
    )
    args = parser.parse_args()

    questions_path = Path(args.questions)
    if not questions_path.exists():
        print(
            f"ERROR: questions file not found: {questions_path}\n"
            "Create evals/questions.json with a list of "
            '{"question": "...", "expected_page": N} objects.',
            file=sys.stderr,
        )
        sys.exit(1)

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        print(f"ERROR: PDF not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    questions = json.loads(questions_path.read_text())
    if not isinstance(questions, list) or not questions:
        print("ERROR: questions.json must be a non-empty JSON array", file=sys.stderr)
        sys.exit(1)

    # Bootstrap DB and Chroma.
    open_pool()
    apply_schema()
    init_chroma()

    results = []
    for cs in args.chunk_sizes:
        row = _run_chunk_size(pdf_path, questions, cs, args.delay)
        results.append(row)

    close_pool()

    print("\n## Retrieval\n")
    print(f"| {'Chunk size':>10} | {'Hit rate':>10} |")
    print(f"| {'-'*10} | {'-'*10} |")
    for r in results:
        print(f"| {r['chunk_size']:>10} | {r['hit_rate']:>9.1%} |")

    print("\n## Grounding\n")
    print(f"| {'Chunk size':>10} | {'Supported':>10} |")
    print(f"| {'-'*10} | {'-'*10} |")
    for r in results:
        print(f"| {r['chunk_size']:>10} | {r['supported_share']:>9.1%} |")

    print("\n## E2E QA\n")
    print(f"| {'Chunk size':>10} | {'Avg latency':>12} |")
    print(f"| {'-'*10} | {'-'*12} |")
    for r in results:
        print(f"| {r['chunk_size']:>10} | {r['avg_latency_s']:>10.2f}s |")


if __name__ == "__main__":
    main()
