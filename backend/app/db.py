from __future__ import annotations

import logging
from contextlib import contextmanager
from pathlib import Path
from typing import Generator
from uuid import UUID

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.config import get_settings

logger = logging.getLogger(__name__)

_pool: ConnectionPool | None = None


def open_pool() -> None:
    global _pool
    settings = get_settings()
    _pool = ConnectionPool(
        conninfo=settings.database_url,
        min_size=1,
        max_size=5,
        check=ConnectionPool.check_connection,
        kwargs={"row_factory": dict_row},
    )
    logger.info("Database pool opened")


def close_pool() -> None:
    global _pool
    if _pool:
        _pool.close()
        logger.info("Database pool closed")


@contextmanager
def get_conn() -> Generator[psycopg.Connection, None, None]:
    if _pool is None:
        raise RuntimeError("Database pool is not initialized")
    with _pool.connection() as conn:
        yield conn


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

def apply_schema() -> None:
    sql = (Path(__file__).parent / "schema.sql").read_text()
    with get_conn() as conn:
        conn.execute(sql)
        conn.commit()
    logger.info("Schema applied")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

def health_check() -> bool:
    try:
        with get_conn() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

def insert_document(
    conn: psycopg.Connection,
    *,
    doc_id: UUID,
    session_id: UUID,
    name: str,
    pages: int,
    chunk_count: int,
) -> None:
    conn.execute(
        """
        INSERT INTO documents (id, session_id, name, pages, chunk_count)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (str(doc_id), str(session_id), name, pages, chunk_count),
    )


def list_documents(conn: psycopg.Connection, *, session_id: UUID) -> list[dict]:
    cur = conn.execute(
        """
        SELECT id, name, pages, chunk_count, created_at
        FROM documents
        WHERE session_id = %s
        ORDER BY created_at DESC
        """,
        (str(session_id),),
    )
    return cur.fetchall()


def get_document(
    conn: psycopg.Connection, *, doc_id: UUID, session_id: UUID
) -> dict | None:
    cur = conn.execute(
        """
        SELECT id, name, pages, chunk_count, created_at
        FROM documents
        WHERE id = %s AND session_id = %s
        """,
        (str(doc_id), str(session_id)),
    )
    return cur.fetchone()


def delete_document(
    conn: psycopg.Connection, *, doc_id: UUID, session_id: UUID
) -> bool:
    cur = conn.execute(
        """
        DELETE FROM documents
        WHERE id = %s AND session_id = %s
        """,
        (str(doc_id), str(session_id)),
    )
    return cur.rowcount > 0


def count_documents(conn: psycopg.Connection, *, session_id: UUID) -> int:
    cur = conn.execute(
        "SELECT COUNT(*) AS n FROM documents WHERE session_id = %s",
        (str(session_id),),
    )
    row = cur.fetchone()
    return row["n"] if row else 0


def delete_expired_documents(conn: psycopg.Connection, *, ttl_hours: int) -> list[str]:
    """Delete expired documents and return their ids."""
    cur = conn.execute(
        """
        DELETE FROM documents
        WHERE created_at < NOW() - (%s || ' hours')::INTERVAL
        RETURNING id
        """,
        (str(ttl_hours),),
    )
    return [row["id"] for row in cur.fetchall()]


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

def insert_message(
    conn: psycopg.Connection,
    *,
    session_id: UUID,
    question: str,
    answer: str,
    mode: str,
    supported: bool,
) -> None:
    conn.execute(
        """
        INSERT INTO messages (session_id, question, answer, mode, supported)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (str(session_id), question, answer, mode, supported),
    )


def delete_expired_messages(conn: psycopg.Connection, *, ttl_hours: int) -> None:
    conn.execute(
        """
        DELETE FROM messages
        WHERE created_at < NOW() - (%s || ' hours')::INTERVAL
        """,
        (str(ttl_hours),),
    )
