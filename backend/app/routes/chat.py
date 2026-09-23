import asyncio
import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field, field_validator, model_validator
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings
from app.db import get_conn, get_document, insert_message
from app.llm import QuotaExceededError
from app.rag import answer_compare, answer_qa, answer_summarize, embed_question, route_question
from app.security import sanitize_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])
limiter = Limiter(key_func=get_remote_address)


def _require_session(x_session_id: str | None = Header(default=None)) -> uuid.UUID:
    if not x_session_id:
        raise HTTPException(status_code=400, detail="X-Session-Id header missing")
    try:
        return uuid.UUID(x_session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="X-Session-Id must be a valid UUID")


class ChatRequest(BaseModel):
    question: Annotated[str, Field(min_length=1)]
    document_ids: Annotated[list[uuid.UUID], Field(min_length=1, max_length=2)]

    @field_validator("question")
    @classmethod
    def check_question_length(cls, v: str) -> str:
        settings = get_settings()
        if len(v) > settings.max_question_chars:
            raise ValueError(f"question exceeds {settings.max_question_chars} characters")
        return v

    @model_validator(mode="after")
    def check_unique_ids(self) -> "ChatRequest":
        if len(set(self.document_ids)) != len(self.document_ids):
            raise ValueError("document_ids must be unique")
        return self


@router.post("")
@limiter.limit(get_settings().rate_limit_chat)
async def chat(
    request: Request,
    body: ChatRequest,
    session_id: uuid.UUID = Depends(_require_session),
):
    """
    Run a RAG chat. Stateless: only the current question goes to the model.
    Returns {answer, mode, citations, supported}.

    Routing and question embedding run concurrently — both need only the
    question text and have no data dependency on each other.
    """
    settings = get_settings()
    question = sanitize_text(body.question, max_chars=settings.max_question_chars)

    with get_conn() as conn:
        for doc_id in body.document_ids:
            row = get_document(conn, doc_id=doc_id, session_id=session_id)
            if row is None:
                raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")

    doc_count = len(body.document_ids)

    try:
        # route_question and embed_question share no data dependency:
        # run them concurrently to overlap the LLM router call with the embed call.
        route_task = asyncio.to_thread(route_question, question, doc_count)
        embed_task = asyncio.to_thread(embed_question, question)
        mode, q_embedding = await asyncio.gather(route_task, embed_task)
        # q_embedding is tuple[float, ...] (lru_cache compatible); answer functions accept it.

        if mode == "summarize":
            # Summarize uses its own fixed retrieval query — q_embedding is not reused.
            result = await answer_summarize(question, session_id, body.document_ids)
        elif mode == "compare":
            result = await answer_compare(
                question, session_id, body.document_ids,
                precomputed_embedding=q_embedding,
            )
        else:
            result = await answer_qa(
                question, session_id, body.document_ids,
                precomputed_embedding=q_embedding,
            )
    except QuotaExceededError:
        raise HTTPException(
            status_code=429,
            detail="The AI service is busy, please try again in a minute.",
            headers={"Retry-After": "60"},
        )
    except RuntimeError:
        logger.exception("LLM call failed")
        raise HTTPException(
            status_code=503,
            detail="The AI model is busy. Please try again shortly.",
            headers={"Retry-After": "10"},
        )

    with get_conn() as conn:
        insert_message(
            conn,
            session_id=session_id,
            question=question,
            answer=result["answer"],
            mode=mode,
            supported=result["supported"],
        )
        conn.commit()

    return {
        "answer": result["answer"],
        "mode": mode,
        "citations": result["citations"],
        "supported": result["supported"],
    }
