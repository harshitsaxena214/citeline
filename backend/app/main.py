from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.config import get_settings
from app.db import apply_schema, close_pool, health_check, open_pool
from app.routes.chat import router as chat_router
from app.routes.documents import router as documents_router
from app.vectorstore import init_chroma

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    open_pool()
    apply_schema()
    init_chroma()
    yield
    close_pool()


# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------

settings = get_settings()

limiter = Limiter(key_func=get_remote_address, default_limits=[])
limiter.upload_limit = settings.rate_limit_upload
limiter.chat_limit = settings.rate_limit_chat

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

_docs_url = "/docs" if settings.enable_docs else None
_openapi_url = "/openapi.json" if settings.enable_docs else None

app = FastAPI(
    title="PDF Document Assistant",
    docs_url=_docs_url,
    openapi_url=_openapi_url,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "X-Session-Id"],
)

app.include_router(documents_router)
app.include_router(chat_router)


# ---------------------------------------------------------------------------
# Middleware: security headers + request logging
# ---------------------------------------------------------------------------


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    start = time.perf_counter()
    request_id = str(uuid.uuid4())[:8]
    response: Response = await call_next(request)
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    # Log: request_id, method, path, status, timing. Never log body content.
    logger.info(
        "rid=%s %s %s %d %dms",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------


from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Invalid request"})

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log full details privately, return generic message.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@app.get("/health")
def health():
    """Runs SELECT 1 to wake Neon compute and confirm the database is reachable."""
    if not health_check():
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ok"}
