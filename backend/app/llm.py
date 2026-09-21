from __future__ import annotations

import logging
from typing import Any

from google import genai
from google.genai import types

from app.config import get_settings

logger = logging.getLogger(__name__)

# Module-level client, created once.
_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=get_settings().gemini_api_key)
    return _client


def generate(
    *,
    system_instruction: str,
    user_prompt: str,
    response_schema: Any,
    timeout: float = 30.0,
) -> Any:
    """
    Single Gemini generate call. Returns the parsed response object.
    response_schema must be a pydantic model or a google.genai Schema.
    Raises RuntimeError on timeout or rate-limit so callers can return 503.
    """
    settings = get_settings()
    client = _get_client()
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=response_schema,
                temperature=0.1,
                max_output_tokens=settings.max_output_tokens,
                http_options=types.HttpOptions(timeout=int(timeout * 1000)),
            ),
        )
        return response.parsed
    except Exception as exc:
        _handle_gemini_error(exc)


def embed(texts: list[str], *, task_type: str, timeout: float = 30.0) -> list[list[float]]:
    """
    Embed a batch of texts. task_type is 'RETRIEVAL_DOCUMENT' or 'RETRIEVAL_QUERY'.
    Returns a list of float vectors in the same order as texts.
    Raises RuntimeError on failure so callers can return 503.
    """
    settings = get_settings()
    client = _get_client()
    try:
        response = client.models.embed_content(
            model=settings.gemini_embed_model,
            contents=texts,
            config=types.EmbedContentConfig(task_type=task_type),
        )
        return [e.values for e in response.embeddings]
    except Exception as exc:
        _handle_gemini_error(exc)


def _handle_gemini_error(exc: Exception) -> None:
    """Log the provider error privately, then raise a generic RuntimeError for the caller."""
    error_type = type(exc).__name__
    logger.error("Gemini error [%s]: %s", error_type, exc)
    raise RuntimeError("LLM service unavailable") from exc
