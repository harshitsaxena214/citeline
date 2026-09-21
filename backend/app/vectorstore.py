from __future__ import annotations

import logging
from uuid import UUID

import chromadb

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None


def init_chroma() -> None:
    global _client, _collection
    settings = get_settings()
    if settings.chroma_api_key:
        _client = chromadb.CloudClient(
            api_key=settings.chroma_api_key,
            tenant=settings.chroma_tenant,
            database=settings.chroma_database,
        )
    else:
        _client = chromadb.PersistentClient(path=settings.chroma_path)

    # cosine distance; no embedding function — we compute embeddings ourselves
    _collection = _client.get_or_create_collection(
        name=settings.chroma_collection,
        metadata={"hnsw:space": "cosine"},
    )
    logger.info("Chroma collection '%s' ready", settings.chroma_collection)


def _get_collection() -> chromadb.Collection:
    if _collection is None:
        raise RuntimeError("Chroma is not initialized")
    return _collection


def add_chunks(
    *,
    ids: list[str],
    embeddings: list[list[float]],
    documents: list[str],
    metadatas: list[dict],
) -> None:
    _get_collection().add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )


def query_chunks(
    *,
    embedding: list[float],
    session_id: UUID,
    document_ids: list[UUID],
    n_results: int,
) -> list[dict]:
    """
    Return up to n_results non-flagged chunks belonging to the given session and documents.
    Each returned dict has: id, document, distance, metadata.
    """
    col = _get_collection()
    doc_id_strs = [str(d) for d in document_ids]

    where: dict = {
        "$and": [
            {"session_id": {"$eq": str(session_id)}},
            {"document_id": {"$in": doc_id_strs}},
            {"flagged": {"$eq": False}},
        ]
    }

    # Chroma raises if n_results > number of items in the collection.
    # We query conservatively and rely on the caller to handle empty results.
    try:
        result = col.query(
            query_embeddings=[embedding],
            n_results=n_results,
            where=where,
            include=["documents", "distances", "metadatas"],
        )
    except Exception as exc:
        # Chroma raises InvalidArgumentError when n_results > collection size.
        logger.warning("Chroma query error (possibly empty collection): %s", exc)
        return []

    chunks = []
    ids_list = result["ids"][0]
    docs_list = result["documents"][0]
    dists_list = result["distances"][0]
    metas_list = result["metadatas"][0]
    for chunk_id, doc, dist, meta in zip(ids_list, docs_list, dists_list, metas_list):
        chunks.append({"id": chunk_id, "document": doc, "distance": dist, "metadata": meta})
    return chunks


def delete_by_document(*, document_id: UUID, session_id: UUID) -> None:
    col = _get_collection()
    col.delete(
        where={
            "$and": [
                {"session_id": {"$eq": str(session_id)}},
                {"document_id": {"$eq": str(document_id)}},
            ]
        }
    )


def delete_by_ids(*, ids: list[str]) -> None:
    if not ids:
        return
    _get_collection().delete(ids=ids)
