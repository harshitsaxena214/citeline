from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Required ---
    gemini_api_key: str
    gemini_model: str
    gemini_embed_model: str
    database_url: str
    allowed_origins: str  # comma-separated

    # --- Chroma ---
    chroma_api_key: Optional[str] = None
    chroma_tenant: Optional[str] = None
    chroma_database: Optional[str] = None
    chroma_path: str = "chroma_data"
    chroma_collection: str = "documents"

    # --- Tunables ---
    max_upload_mb: int = 10
    max_pdf_pages: int = 50
    max_docs_per_session: int = 5
    max_question_chars: int = 1000
    chunk_size: int = 1000
    chunk_overlap: int = 150
    top_k: int = 5
    max_distance: float = 1.4
    max_summary_chunks: int = 20
    max_output_tokens: int = 1024
    document_ttl_hours: int = 24
    rate_limit_upload: str = "5/hour"
    rate_limit_chat: str = "10/minute"
    enable_docs: bool = False

    @field_validator("database_url")
    @classmethod
    def require_ssl(cls, v: str) -> str:
        if "sslmode" not in v:
            raise ValueError("DATABASE_URL must include sslmode=require")
        return v

    @model_validator(mode="after")
    def check_cloud_chroma_fields(self) -> "Settings":
        if self.chroma_api_key and not (self.chroma_tenant and self.chroma_database):
            raise ValueError(
                "CHROMA_TENANT and CHROMA_DATABASE are required when CHROMA_API_KEY is set"
            )
        return self

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


def _load() -> Settings:
    """Load settings, exiting with a clear message on missing required variables."""
    required = [
        "GEMINI_API_KEY",
        "GEMINI_MODEL",
        "GEMINI_EMBED_MODEL",
        "DATABASE_URL",
        "ALLOWED_ORIGINS",
    ]
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        names = ", ".join(missing)
        raise SystemExit(f"Missing required environment variables: {names}")
    return Settings()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return _load()
