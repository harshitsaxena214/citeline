# PDF Document Assistant — Technical Reference

## What This Project Does

This is a backend API that lets users upload PDF documents and ask questions about them. It extracts text from PDFs, splits them into overlapping chunks, embeds the chunks with Gemini, stores them in Chroma, and answers questions by retrieving the most relevant chunks and sending them to Gemini together with the question. The service supports three modes: question-answering, summarization, and document comparison.

## Architecture and File Map

```
app/config.py        Environment settings with fail-fast validation
app/db.py            Postgres connection pool and all SQL (parameterized, raw SQL only)
app/schema.sql       Table DDL applied at startup with IF NOT EXISTS
app/llm.py           All Gemini calls: generate() and embed()
app/vectorstore.py   All Chroma access: init, add, query, delete
app/security.py      Text sanitizing, injection screening, source wrapping, output cleaning
app/ingest.py        PDF validation, extraction, chunking, embedding, storage
app/rag.py           Router, QA, summarize, compare, grounding checker; all prompts live here
app/routes/documents.py  POST, GET, DELETE /documents
app/routes/chat.py   POST /chat
app/main.py          App creation, middleware, error handlers, /health, router includes
evals/run_eval.py    Offline eval script (no server needed)
tests/test_security.py   Pure unit tests for security functions
```

## Request Flow: Upload

1. Client sends `POST /documents` with `X-Session-Id` header and a multipart PDF.
2. `_require_session` validates the UUID header and returns 400 if missing or malformed.
3. slowapi checks the per-IP upload rate limit (default: 5/hour) and returns 429 if exceeded.
4. The file body is read in 64 KB blocks and stopped if it exceeds MAX_UPLOAD_MB (never loaded unbounded). Returns 413 if too large.
5. The first 5 bytes are checked for `%PDF-` magic. Returns 400 if not a PDF.
6. The session's document count is checked. Returns 400 if at the cap.
7. pypdf opens the in-memory bytes. Encrypted or oversized PDFs return 400.
8. Each page's text is NFKC-normalized, stripped of invisible characters and source-tag fragments, collapsed whitespace, and truncated.
9. Text is chunked per page, preferring paragraph then sentence boundaries over hard cuts.
10. Each chunk is screened for injection patterns. Matching chunks are stored with `flagged=true` and never retrieved.
11. All chunks are embedded in one Gemini batch call with task type `RETRIEVAL_DOCUMENT`.
12. Chunks are stored in Chroma with metadata: session_id, document_id, document_name, page, flagged.
13. The document row is inserted in Postgres.
14. Expired documents and messages (across all sessions) are deleted from Postgres; their Chroma chunks are purged.
15. Returns `{id, name, pages, chunks}`.

Why chunks per page: it lets us build accurate page-level citations from metadata, never from model output.

Why chunk overlap: it prevents a sentence from being split across two chunks where neither chunk contains enough context to answer a question about it.

## Request Flow: Chat

1. Client sends `POST /chat` with `X-Session-Id` and JSON body `{question, document_ids}`.
2. Session UUID is validated (400 on failure).
3. slowapi checks the per-IP chat rate limit (default: 10/minute).
4. Pydantic validates `question` length (max MAX_QUESTION_CHARS) and `document_ids` (1-2 unique UUIDs).
5. The question is sanitized (same pipeline as PDF text).
6. All document_ids are verified to belong to this session in Postgres. Returns 404 if any are missing or belong to another session.
7. **Router** (1 Gemini call): sends only the question text and the document count (never document content). Returns one of: `summarize`, `qa`, `compare`. Falls back to `qa` on any failure. Business rule: `compare` requires exactly 2 documents; otherwise falls back to `qa`.
8. **Answer** (1 Gemini call): see per-mode logic below.
9. **Grounding checker** (1 Gemini call): verifies that every factual claim in the draft answer is supported by the retrieved chunks. If not, the answer is replaced with a cautious fallback and `supported=false`.
10. The exchange is saved to the messages table (for history only; never sent back to the model).
11. Returns `{answer, mode, citations, supported}`.

### QA mode
The question is embedded with task type `RETRIEVAL_QUERY`. The TOP_K closest non-flagged chunks (filtered by session and document_ids) are retrieved from Chroma. If the best match distance exceeds MAX_DISTANCE, the model is not called and the answer is "I could not find this in the documents." This avoids hallucination when nothing relevant is in the corpus. If chunks are retrieved, they are wrapped in `<source>` tags with a per-request nonce and sent as the user turn. The model returns `{answer, source_ids}`. The server validates that every source_id was in the retrieved set; ids outside the set are dropped. If no valid id remains, the answer is treated as unsupported.

### Summarize mode
Up to MAX_SUMMARY_CHUNKS chunks are sampled evenly from the retrieved set and sent in one call. Citations are returned as an empty list because no single page is the primary source of a summary.

### Compare mode
The top chunks are retrieved per document separately and concatenated. This ensures both documents are represented even if one is closer to the query embedding than the other.

Why citations come from the server: the model could hallucinate page numbers. We build citations exclusively from the metadata of the chunks whose ids the model cited, so the page numbers are always accurate.

Why the chat is stateless: sending earlier messages to the model would increase cost and latency linearly with conversation length, make injection via earlier turns trivial, and complicate the grounding check. The messages table is for user-facing history display only.

Why a grounding checker: a single model call can produce fluent but unsupported claims. A second call that sees both the draft and the sources acts as a cheap self-audit. It is another LLM call, so it can also be fooled — this is a defense in depth layer, not a guarantee.

## Threat and Defense Table

| Threat | Defense | Honest Limitation |
|---|---|---|
| Prompt injection via PDF content | Chunks wrapped in `<source nonce="...">` tags; model instructed that content inside tags is untrusted quotation to ignore | A sufficiently clever or verbose injection may still influence the model |
| Injection pattern detection | Regex list flags matching chunks as `flagged=true`; they are excluded from retrieval | Heuristic only; paraphrasing or encoding bypasses it |
| Session data leakage | Every SQL query and every Chroma query filters by session_id | X-Session-Id is a client-supplied header, not a real authentication token. Any client that knows or guesses a session UUID can access its documents. |
| Model hallucination | Source ids validated server-side; grounding checker run on every answer | Checker is another LLM and can also hallucinate |
| Data exfiltration via URLs | Output cleaning strips markdown images, markdown links, and raw URLs | Attacker could encode data in non-URL form (e.g., base64 in plain text) |
| Rate abuse | slowapi per-IP limits on upload (strict) and chat | Easily bypassed by rotating IPs; no auth or CAPTCHA |
| Oversized inputs | MAX_UPLOAD_MB enforced in streaming fashion; MAX_QUESTION_CHARS; MAX_PDF_PAGES; MAX_TOTAL_CHARS cap | |
| Provider error leakage | All Gemini errors logged privately; only generic "AI service temporarily unavailable" returned to client | |
| Session isolation note | This is not real authentication. The X-Session-Id header is not signed or verified. Do not store sensitive data in documents. | |

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| GEMINI_API_KEY | Yes | — | Google AI Studio API key |
| GEMINI_MODEL | Yes | — | Model name, e.g. `gemini-2.0-flash` |
| GEMINI_EMBED_MODEL | Yes | — | Embedding model name, e.g. `text-embedding-004` |
| DATABASE_URL | Yes | — | Neon direct connection string, must include `sslmode=require` |
| ALLOWED_ORIGINS | Yes | — | Comma-separated CORS origins |
| CHROMA_API_KEY | No | — | Set for Chroma Cloud; omit for local |
| CHROMA_TENANT | No | — | Required if CHROMA_API_KEY is set |
| CHROMA_DATABASE | No | — | Required if CHROMA_API_KEY is set |
| CHROMA_PATH | No | `chroma_data` | Local Chroma folder |
| CHROMA_COLLECTION | No | `documents` | Chroma collection name |
| MAX_UPLOAD_MB | No | 10 | Max PDF size in MB |
| MAX_PDF_PAGES | No | 50 | Max pages per PDF |
| MAX_DOCS_PER_SESSION | No | 5 | Max documents per session |
| MAX_QUESTION_CHARS | No | 1000 | Max question length |
| CHUNK_SIZE | No | 1000 | Characters per chunk |
| CHUNK_OVERLAP | No | 150 | Overlap between adjacent chunks |
| TOP_K | No | 5 | Chunks retrieved per query |
| MAX_DISTANCE | No | 1.4 | Cosine distance cutoff (0=identical, 2=opposite); tune with evals |
| MAX_SUMMARY_CHUNKS | No | 20 | Max chunks used in summarize mode |
| MAX_OUTPUT_TOKENS | No | 1024 | Token cap on model output |
| DOCUMENT_TTL_HOURS | No | 24 | Retention period for documents and messages |
| RATE_LIMIT_UPLOAD | No | `5/hour` | Upload rate limit per IP |
| RATE_LIMIT_CHAT | No | `10/minute` | Chat rate limit per IP |
| ENABLE_DOCS | No | `false` | Set to `true` to expose /docs |

## How to Run Locally

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux / macOS

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy and fill in environment variables
cp .env.example .env
# Edit .env and set at minimum:
# GEMINI_API_KEY, GEMINI_MODEL, GEMINI_EMBED_MODEL, DATABASE_URL, ALLOWED_ORIGINS

# 4. Start the server
uvicorn app.main:app --reload

# The server starts at http://localhost:8000
# /health checks the database connection
```

## How to Run Tests

```bash
python -m pytest
```

Tests in `tests/test_security.py` make no network calls and require no environment variables.

## How to Run Evals

```bash
# 1. Create evals/questions.json (the script exits if it is missing):
# [{"question": "What is the main topic?", "expected_page": 1}, ...]

# 2. Run
python -m evals.run_eval \
    --pdf path/to/document.pdf \
    --questions evals/questions.json \
    --chunk-sizes 500 1000 \
    --delay 2

# Output: markdown table to stdout with hit rate, supported share, and average latency.
# Use results to tune MAX_DISTANCE and CHUNK_SIZE in .env.
```

## How to Deploy on Render or Railway with Neon and Chroma Cloud

1. Create a Neon project. Copy the direct connection string (includes `sslmode=require`).
2. Create a Chroma Cloud tenant and database. Copy the API key, tenant, and database name.
3. In Render or Railway, set all required environment variables from the table above. Do not commit `.env`.
4. Point the deploy to this repo. The Dockerfile is at the root.
5. The start command in the Dockerfile uses `${PORT:-8000}` which Render and Railway set automatically.
6. Set `ALLOWED_ORIGINS` to your frontend URL (not `*`).

## 12 Interview Questions

**1. Why raw SQL instead of an ORM?**
ORMs add a layer that can hide performance problems and generate unexpected queries. For a small schema with a few parameterized queries, raw SQL is more readable and the intent is explicit. psycopg 3 handles parameter binding safely.

**2. Why sync routes instead of async?**
psycopg 3's sync client and chromadb's sync client both block the thread. Wrapping them in `asyncio.run_in_executor` adds complexity for little gain in a backend that is mostly I/O-bound on external services rather than concurrent in-process work. Uvicorn with multiple workers handles concurrency at the process level.

**3. Why session isolation instead of user auth?**
The spec explicitly calls for session-based isolation without authentication. The X-Session-Id is a convenience, not a security boundary. A production system would replace it with a signed JWT or session cookie.

**4. Why is the router a separate Gemini call?**
Mixing routing logic into the answer prompt makes the model do two things at once and makes the routing decision hard to audit or override. A separate call with a constrained output schema gives a clean, testable routing signal.

**5. Why does MAX_DISTANCE default to 1.4?**
Cosine distance in Chroma ranges from 0 (identical) to 2 (opposite). A value of 1.4 corresponds to roughly 30 degrees of similarity, which excludes clearly unrelated chunks while allowing topically related but not verbatim matches. It must be tuned with the eval script on representative documents because the right value depends on the embedding model and domain.

**6. Why are citations built from metadata rather than model output?**
The model can hallucinate page numbers. Metadata on each chunk is written at ingest time from pypdf's page index and is factual. Building citations server-side makes them verifiable.

**7. Why wrap chunks in source tags with a nonce?**
A PDF could contain text like `</source>` to break out of its own tag and inject content into the prompt structure. The nonce ensures a document cannot predict and reproduce the exact tag format used in this request. The sanitizer also strips source tag patterns from ingested text before chunking.

**8. Why is the grounding checker a second model call instead of a classifier?**
A fine-tuned classifier would need training data. A second LLM call with a yes/no JSON schema is simpler, generalizes to any domain, and is cheap relative to the answer call. Its limitation is that it can hallucinate the same way the answer model does.

**9. How does the retention system work?**
On every upload, expired documents older than DOCUMENT_TTL_HOURS are deleted from Postgres (returning their ids) and their Chroma chunks are deleted by document_id. This runs synchronously on upload rather than on a background schedule to avoid needing a scheduler dependency.

**10. Why is chunk_size per character rather than per token?**
Token counts depend on the tokenizer, which varies by model. Character counts are model-independent and easy to reason about. 1000 characters is roughly 200-300 tokens for English text, well within most model context windows per chunk.

**11. Why does compare retrieve chunks per document separately?**
A single retrieval across both documents could return all TOP_K chunks from the more relevant document, leaving the other unrepresented. Per-document retrieval guarantees both documents contribute to the answer.

**12. What should a frontend author know about rendering answers?**
Render answers as plain text, not HTML or markdown. The output cleaner strips markdown links and images, but a frontend that renders markdown could still be tricked by unusual formatting. Never execute or follow URLs in answers. Display `supported=false` prominently as a warning that the answer may not be grounded in the documents.
