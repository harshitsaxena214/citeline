# RAG Pipeline Latency Optimizations

This document explains the latency issues discovered in the RAG pipeline and the fixes applied to `app/rag.py` and related dependencies.

## Phase 1 — Before (Investigation)

### Async/Sync Architecture
- The entire codebase (`generate()`, `embed()`, `query_chunks()`, `chat()`) was entirely synchronous. 
- Because all I/O was sync, no true concurrency was possible between stages, forcing all network calls to happen serially.

### Estimated sequential latency per stage:
- **Route question**: ~1–2s (1 Gemini call)
- **Embed question**: ~200–400ms (1 Gemini call)
- **Chroma query**: ~10–100ms local, ~200–500ms cloud (1 `col.query()` per doc)
- **Answer generation**: ~2–5s (1 Gemini call)
- **Grounding check**: ~1–2s (1 Gemini call)
- **Total (QA mode)**: ~5–11s

### Key Bottlenecks Identified
1. **No concurrency between Routing and Retrieval:** In `answer_qa`, `route_question` and `_retrieve` ran sequentially despite having no data dependency. Both only require the question string.
2. **Double LLM Round-Trip (`_call_answer` + `_check_grounding`):** The answer was generated, then a second completely independent LLM call was made to verify it, adding ~1-2s.
3. **Compare Mode Retrieval Loop:** `answer_compare` ran a sequential `for` loop to retrieve chunks for each document, serializing both embedding generation and Chroma queries.
4. **Summarize Over-fetch:** `answer_summarize` hardcoded `n_results=50` from Chroma, then down-sampled to `max_summary_chunks` (20), fetching 2.5x more data than needed.
5. **No Embedding Cache:** Every request, even with an identical question to the previous one in the same session, re-ran the Gemini `embed()` call.
6. **No LLM Timeout Defaults:** `embed()` had no timeout parameters, risking hanging requests.

## Phase 2 — Changes Made

### 1. Concurrency using `asyncio.to_thread`
- **What:** Refactored `chat()` in `app/routes/chat.py` to be `async def`. Wrapped sync blocking calls in `asyncio.to_thread`.
- **Why:** Allows overlapping I/O-bound tasks using the existing synchronous functions without rewriting `llm.py` or `vectorstore.py` to be natively async.

### 2. Concurrent Routing and Question Embedding
- **What:** In `chat.py`, `route_question` and `embed_question` now run concurrently using `asyncio.gather`.
- **Why:** The router (Gemini call) and the embedding (Gemini call) no longer block each other. The embedding is then passed directly to the answer functions.

### 3. Regex Routing (No LLM Call for 1 Document)
- **What:** `route_question` now uses regex matching (`summarize`, `overview`, `tl;dr`, etc.) if exactly 1 document is selected.
- **Why:** Saves an entire Gemini round-trip (~1-2s) for standard QA/Summarize tasks. LLM routing is now strictly reserved for the 2-document case (to decide between `compare` and `qa`).

### 4. Fast Model for Routing
- **What:** Added `GEMINI_FAST_MODEL` fallback in `.env.example` and `config.py`. Enforced a strict 16-token output cap in the router LLM call.
- **Why:** Minimizes cost and time spent on the router when it *is* invoked.

### 5. Combined Answer + Grounding (Option A)
- **What:** Refactored `_call_answer` and `_check_grounding` into a single `_generate_combined` function returning a `_CombinedOutput` schema (`answer`, `source_ids`, `supported`).
- **Tradeoff Accepted:** Trading a small amount of grounding rigor (self-grading vs independent grading) to completely eliminate one LLM round-trip (~1-2s). 

### 6. Parallel Per-Document Retrieval in `compare` mode
- **What:** `answer_compare` now runs the `query_chunks` call for each document simultaneously using `asyncio.gather`.
- **Why:** Turns $O(N)$ retrieval time into $O(1)$.

### 7. Summarize Over-fetch Fixed and Token Limits Lowered
- **What:** Passed `max_summary_chunks` directly to `query_chunks(n_results=...)` instead of hardcoding 50. Lowered default `max_summary_chunks` from 20 to 12.
- **Why:** Avoids over-fetching from the vector DB and dramatically cuts token usage on summarize prompts.

### 8. Embedding Cache
- **What:** Added `@functools.lru_cache(maxsize=256)` to `embed_question()` in `rag.py`. 
- **Why:** Repeated queries instantly hit cache. Memory-safe as it's isolated per-process and only caches the short question embeddings. 

### 9. Quota and Timeout Handling
- **What:** Added `timeout=30.0` to `embed()`. Modified `_handle_gemini_error` to detect 429 / RESOURCE_EXHAUSTED and raise a new `QuotaExceededError`. `chat.py` maps this cleanly to an HTTP 429 response without logging user data.
- **Why:** Graceful degradation when the Gemini Free Tier limits are hit.

## Phase 3 — After (Expected Improvements)

### Latency Improvements
- **1-Document QA:**
  - *Before:* Route LLM (2s) + Embed LLM (0.3s) + Retrieve (0.1s) + Answer LLM (3s) + Check LLM (2s) = **~7.4s**
  - *After:* Route Regex (0s) & Embed LLM (0.3s) [Parallel] + Retrieve (0.1s) + Combined Answer/Check LLM (3.5s) = **~3.9s** (**~45% faster**)
- **2-Document Compare:**
  - *Before:* Route LLM (2s) + Embed LLM (0.3s) + Retrieve Doc 1 (0.1s) + Retrieve Doc 2 (0.1s) + Answer LLM (4s) + Check LLM (2s) = **~8.5s**
  - *After:* [Route LLM & Embed LLM parallel max(~2s)] + [Retrieve Doc 1 & 2 parallel max(~0.1s)] + Combined Answer/Check LLM (4.5s) = **~6.6s** (**~20% faster**)
  
**Total reduction in LLM API calls per request:** Reduced from ~3 API calls to **1-2 API calls**.
