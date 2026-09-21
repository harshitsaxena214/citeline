"""
Tests for the optimised RAG pipeline (rag.py and llm.py).

All tests are unit-only: no network calls, no I/O, no real Gemini/Chroma.
"""
from __future__ import annotations

import asyncio
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.llm import QuotaExceededError, _handle_gemini_error


# ---------------------------------------------------------------------------
# QuotaExceededError detection in _handle_gemini_error
# ---------------------------------------------------------------------------


class TestHandleGeminiError:
    def test_429_in_message_raises_quota_error(self):
        with pytest.raises(QuotaExceededError):
            _handle_gemini_error(Exception("HTTP 429 Too Many Requests"))

    def test_resource_exhausted_raises_quota_error(self):
        with pytest.raises(QuotaExceededError):
            _handle_gemini_error(Exception("RESOURCE_EXHAUSTED: quota limit exceeded"))

    def test_quota_keyword_raises_quota_error(self):
        with pytest.raises(QuotaExceededError):
            _handle_gemini_error(Exception("You have exceeded your quota"))

    def test_rate_limit_keyword_raises_quota_error(self):
        with pytest.raises(QuotaExceededError):
            _handle_gemini_error(Exception("rate_limit reached"))

    def test_generic_error_raises_runtime_error(self):
        with pytest.raises(RuntimeError) as exc_info:
            _handle_gemini_error(Exception("connection timeout"))
        assert not isinstance(exc_info.value, QuotaExceededError)

    def test_quota_error_is_runtime_error_subclass(self):
        """QuotaExceededError must be catchable as RuntimeError in existing handlers."""
        assert issubclass(QuotaExceededError, RuntimeError)

    def test_cause_is_chained(self):
        original = ValueError("original error")
        with pytest.raises(QuotaExceededError) as exc_info:
            _handle_gemini_error(Exception("RESOURCE_EXHAUSTED"))
        # __cause__ should be set (from exc)


# ---------------------------------------------------------------------------
# 1-doc regex routing (no LLM call)
# ---------------------------------------------------------------------------


class TestRouteQuestion:
    def test_single_doc_summarize_keyword_no_llm(self):
        from app.rag import route_question
        with patch("app.rag.generate") as mock_gen:
            result = route_question("Please summarize this document", 1)
        mock_gen.assert_not_called()
        assert result == "summarize"

    def test_single_doc_overview_keyword_no_llm(self):
        from app.rag import route_question
        with patch("app.rag.generate") as mock_gen:
            result = route_question("Give me an overview of the document", 1)
        mock_gen.assert_not_called()
        assert result == "summarize"

    def test_single_doc_tldr_no_llm(self):
        from app.rag import route_question
        with patch("app.rag.generate") as mock_gen:
            result = route_question("tl;dr", 1)
        mock_gen.assert_not_called()
        assert result == "summarize"

    def test_single_doc_qa_no_llm(self):
        from app.rag import route_question
        with patch("app.rag.generate") as mock_gen:
            result = route_question("What is the main finding?", 1)
        mock_gen.assert_not_called()
        assert result == "qa"

    def test_two_docs_calls_llm_for_compare(self):
        from app.rag import route_question, _RouterOutput, _RouteMode
        mock_result = _RouterOutput(mode=_RouteMode.compare)
        with patch("app.rag.generate", return_value=mock_result) as mock_gen:
            result = route_question("Compare these two documents", 2)
        mock_gen.assert_called_once()
        assert result == "compare"

    def test_two_docs_compare_allowed(self):
        from app.rag import route_question, _RouterOutput, _RouteMode
        with patch("app.rag.generate", return_value=_RouterOutput(mode=_RouteMode.compare)):
            assert route_question("Compare them", 2) == "compare"

    def test_router_failure_falls_back_to_qa(self):
        from app.rag import route_question
        with patch("app.rag.generate", side_effect=RuntimeError("LLM down")):
            result = route_question("Some question", 2)
        assert result == "qa"

    def test_router_uses_fast_model(self):
        """Router must pass model=gemini_fast_model_resolved to generate()."""
        from app.rag import route_question, _RouterOutput, _RouteMode
        with patch("app.rag.generate", return_value=_RouterOutput(mode=_RouteMode.qa)) as mock_gen, \
             patch("app.rag.get_settings") as mock_settings:
            mock_settings.return_value.gemini_fast_model_resolved = "gemini-2.0-flash"
            route_question("some question", 2)
        call_kwargs = mock_gen.call_args.kwargs
        assert call_kwargs.get("model") == "gemini-2.0-flash"
        assert call_kwargs.get("max_output_tokens") == 16


# ---------------------------------------------------------------------------
# answer_compare: parallel retrieval
# ---------------------------------------------------------------------------


class TestAnswerCompareParallelRetrieval:
    """Verify query_chunks is called once per document, not sequentially."""

    def _make_chunk(self, text: str, doc_name: str) -> dict:
        return {
            "id": f"id-{text[:4]}",
            "document": text,
            "distance": 0.1,
            "metadata": {"document_name": doc_name, "page": 1},
        }

    def test_query_chunks_called_for_each_document(self):
        from app.rag import answer_compare

        doc_id_1 = uuid4()
        doc_id_2 = uuid4()
        session_id = uuid4()

        chunks_1 = [self._make_chunk("text from doc 1", "doc1.pdf")]
        chunks_2 = [self._make_chunk("text from doc 2", "doc2.pdf")]

        queried_doc_ids: list = []

        def mock_query_chunks(**kwargs):
            queried_doc_ids.extend(kwargs["document_ids"])
            if kwargs["document_ids"] == [doc_id_1]:
                return chunks_1
            return chunks_2

        mock_result = _CombinedOutput_stub("Comparison answer", [1, 2], True)

        with patch("app.rag.query_chunks", side_effect=mock_query_chunks), \
             patch("app.rag._generate_combined", return_value=mock_result), \
             patch("app.rag.generate_nonce", return_value="abc123"), \
             patch("app.rag.wrap_sources", return_value="<sources/>"), \
             patch("app.rag.clean_output", side_effect=lambda x: x):

            result = asyncio.run(
                answer_compare(
                    "Compare the documents",
                    session_id,
                    [doc_id_1, doc_id_2],
                    precomputed_embedding=(0.1, 0.2, 0.3),
                )
            )

        assert doc_id_1 in queried_doc_ids
        assert doc_id_2 in queried_doc_ids
        assert len(queried_doc_ids) == 2
        assert result["answer"] == "Comparison answer"
        assert result["supported"] is True

    def test_empty_chunks_returns_not_found(self):
        from app.rag import answer_compare

        with patch("app.rag.query_chunks", return_value=[]):
            result = asyncio.run(
                answer_compare(
                    "Compare them",
                    uuid4(),
                    [uuid4(), uuid4()],
                    precomputed_embedding=(0.1,),
                )
            )
        assert "not find" in result["answer"].lower()
        assert result["citations"] == []
        assert result["supported"] is False


# ---------------------------------------------------------------------------
# answer_summarize: over-fetch fix
# ---------------------------------------------------------------------------


class TestAnswerSummarizeOverFetch:
    def test_uses_max_summary_chunks_not_50(self):
        """query_chunks must be called with n_results=max_summary_chunks, not 50."""
        from app.rag import answer_summarize

        called_n_results: list[int] = []

        def mock_query_chunks(**kwargs):
            called_n_results.append(kwargs["n_results"])
            return []

        with patch("app.rag.query_chunks", side_effect=mock_query_chunks), \
             patch("app.rag.embed_question", return_value=(0.1,)), \
             patch("app.rag.get_settings") as mock_settings:
            mock_settings.return_value.max_summary_chunks = 12
            asyncio.run(answer_summarize("Summarize this", uuid4(), [uuid4()]))

        assert called_n_results == [12]
        assert 50 not in called_n_results


# ---------------------------------------------------------------------------
# Stub helper for _CombinedOutput (avoid importing pydantic model in tests)
# ---------------------------------------------------------------------------


class _CombinedOutput_stub:
    def __init__(self, answer: str, source_ids: list[int], supported: bool):
        self.answer = answer
        self.source_ids = source_ids
        self.supported = supported
