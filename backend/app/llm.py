from __future__ import annotations

import logging
import re
from typing import Any

from google import genai
from google.genai import types

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: genai.Client | None = None

# ---------------------------------------------------------------------------
# Quota / rate-limit detection
# ---------------------------------------------------------------------------

_QUOTA_RE = re.compile(r"429|RESOURCE_EXHAUSTED|quota|rate.?limit", re.IGNORECASE)
_RETRY_DELAY_RE = re.compile(r"retry[^\d]*(\d+)\s*s", re.IGNORECASE)


class QuotaExceededError(RuntimeError):
    """Raised when Gemini returns HTTP 429 / RESOURCE_EXHAUSTED."""


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=get_settings().gemini_api_key)
    return _client


# ---------------------------------------------------------------------------
# generate()
# ---------------------------------------------------------------------------


def generate(
    *,
    system_instruction: str,
    user_prompt: str,
    response_schema: Any,
    timeout: float = 30.0,
    model: str | None = None,
    max_output_tokens: int | None = None,
) -> Any:
    """
    Single Gemini generate call. Returns the parsed response object.

    Args:
        model: Override model; defaults to settings.gemini_model.
        max_output_tokens: Override token cap; defaults to settings.max_output_tokens.
    Raises:
        QuotaExceededError: On HTTP 429 / RESOURCE_EXHAUSTED.
        RuntimeError: On other Gemini failures.
    """
    settings = get_settings()
    client = _get_client()
    resolved_model = model or settings.gemini_model
    resolved_tokens = max_output_tokens if max_output_tokens is not None else settings.max_output_tokens
    try:
        response = client.models.generate_content(
            model=resolved_model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=response_schema,
                temperature=0.1,
                max_output_tokens=resolved_tokens,
                http_options=types.HttpOptions(timeout=int(timeout * 1000)),
            ),
        )
        return response.parsed
    except Exception as exc:
        _handle_gemini_error(exc)


# ---------------------------------------------------------------------------
# embed()
# ---------------------------------------------------------------------------


def embed(texts: list[str], *, task_type: str, timeout: float = 30.0) -> list[list[float]]:
    """
    Embed a batch of texts. task_type is 'RETRIEVAL_DOCUMENT' or 'RETRIEVAL_QUERY'.
    Returns a list of float vectors in the same order as texts.

    Raises:
        QuotaExceededError: On HTTP 429 / RESOURCE_EXHAUSTED.
        RuntimeError: On other failures.
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


# ---------------------------------------------------------------------------
# Error handler
# ---------------------------------------------------------------------------


def _handle_gemini_error(exc: Exception) -> None:
    """
    Classify the provider error and raise the appropriate typed exception.
    Logs: exception class, quota name, retry delay if present.
    Never logs: prompts, document text, or API keys.
    """
    error_type = type(exc).__name__
    error_str = str(exc)

    if _QUOTA_RE.search(error_str) or _QUOTA_RE.search(error_type):
        retry_suffix = ""
        m = _RETRY_DELAY_RE.search(error_str)
        if m:
            retry_suffix = f", retry_after={m.group(1)}s"
        logger.warning("Gemini quota exceeded [%s]%s", error_type, retry_suffix)
        raise QuotaExceededError("Gemini quota exceeded") from exc

    logger.error("Gemini error [%s]: %s", error_type, exc)
    raise RuntimeError("LLM service unavailable") from exc
