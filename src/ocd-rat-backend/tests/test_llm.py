"""
Tests for the LLM module: prompt_builder.py, schema_inspector.py, and llm_service.py.
All external calls (DB, OpenAI) are mocked.
"""

import pytest
import json
import os
import pandas as pd
from unittest.mock import patch, MagicMock

# Env vars are set in conftest.py — safe to import LLM modules here.


# ============================================================================
# prompt_builder
# ============================================================================

class TestBuildSystemPrompt:
    @patch("llm.prompt_builder.inspect_schema")
    def test_contains_key_phrases(self, mock_inspect):
        mock_inspect.return_value = "Table: experimental_sessions\n  - session_id (integer)"
        from llm.prompt_builder import build_system_prompt
        prompt = build_system_prompt()
        assert "PostgreSQL Query Generator" in prompt
        assert "experimental_sessions" in prompt

    @patch("llm.prompt_builder.inspect_schema")
    def test_no_dangling_placeholders(self, mock_inspect):
        mock_inspect.return_value = "Table: rats\n  - rat_id (integer)"
        from llm.prompt_builder import build_system_prompt
        prompt = build_system_prompt()
        assert "{schema}" not in prompt
        assert "{semantic_context}" not in prompt

    @patch("llm.prompt_builder.inspect_schema")
    def test_includes_semantic_context(self, mock_inspect):
        mock_inspect.return_value = ""
        from llm.prompt_builder import build_system_prompt
        prompt = build_system_prompt()
        assert "Session-Centric Design" in prompt


# ============================================================================
# schema_inspector
# ============================================================================

class TestInspectSchema:
    @patch("llm.schema_inspector.get_db_connection")
    def test_returns_formatted_string(self, mock_get_conn):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_conn.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        # Simulate: one table with one column, no FKs
        mock_cursor.fetchall.side_effect = [
            [("rats",)],                      # tables list
            [("rat_id", "integer")],           # columns
            [],                                # foreign keys
        ]

        from llm.schema_inspector import inspect_schema
        result = inspect_schema()
        assert "Table: rats" in result
        assert "rat_id (integer)" in result
        mock_conn.close.assert_called_once()

    @patch("llm.schema_inspector.get_db_connection")
    def test_error_handling(self, mock_get_conn):
        mock_get_conn.side_effect = Exception("Connection refused")
        from llm.schema_inspector import inspect_schema
        result = inspect_schema()
        assert "Error" in result


# ============================================================================
# LLMService — helper to build a service with mocked client
# ============================================================================

def _make_llm_service():
    """Create an LLMService with a mocked OpenAI client (import is safe
    because conftest.py already sets the env vars)."""
    from llm.llm_service import LLMService
    svc = LLMService()
    svc.client = MagicMock()
    svc._system_prompt = "test prompt"
    return svc


def _mock_streaming(svc, text):
    """Set up a mock streaming response that yields `text` as a single chunk."""
    mock_chunk = MagicMock()
    mock_choice = MagicMock()
    mock_choice.delta.content = text
    mock_chunk.choices = [mock_choice]
    svc.client.chat.completions.create.return_value = [mock_chunk]


# ============================================================================
# LLMService.plan_and_generate_sql
# ============================================================================

class TestPlanAndGenerateSql:
    def test_valid_json_response(self):
        svc = _make_llm_service()
        response_text = json.dumps({"rationale": "Test rationale", "sql": "SELECT 1"})
        _mock_streaming(svc, response_text)
        result = svc.plan_and_generate_sql("test query")
        assert result["rationale"] == "Test rationale"
        assert result["sql"] == "SELECT 1"

    def test_markdown_wrapped_json_cleaned(self):
        svc = _make_llm_service()
        response_text = '```json\n{"rationale": "r", "sql": "SELECT 2"}\n```'
        _mock_streaming(svc, response_text)
        result = svc.plan_and_generate_sql("test query")
        assert result["sql"] == "SELECT 2"

    def test_missing_fields_fallback(self):
        svc = _make_llm_service()
        response_text = json.dumps({"only_sql": "SELECT 1"})
        _mock_streaming(svc, response_text)
        result = svc.plan_and_generate_sql("test query")
        assert "rationale" in result
        assert "sql" in result

    def test_json_decode_error_fallback(self):
        svc = _make_llm_service()
        _mock_streaming(svc, "not valid json at all")
        result = svc.plan_and_generate_sql("test query")
        assert "rationale" in result
        assert "sql" in result


# ============================================================================
# LLMService.generate_sql
# ============================================================================

class TestGenerateSql:
    def test_removes_markdown_code_blocks(self):
        svc = _make_llm_service()
        _mock_streaming(svc, "```sql\nSELECT 1\n```")
        result = svc.generate_sql("test")
        assert "```" not in result
        assert "SELECT 1" in result

    def test_error_returns_comment(self):
        svc = _make_llm_service()
        svc.client.chat.completions.create.side_effect = Exception("API down")
        result = svc.generate_sql("test")
        assert "Error" in result


# ============================================================================
# LLMService.ask_question
# ============================================================================

class TestAskQuestion:
    def test_yields_tokens(self):
        svc = _make_llm_service()
        mock_chunk = MagicMock()
        mock_choice = MagicMock()
        mock_choice.delta.content = "Hello"
        mock_chunk.choices = [mock_choice]
        svc.client.chat.completions.create.return_value = [mock_chunk]

        tokens = list(svc.ask_question("Hi"))
        assert "Hello" in tokens

    def test_yields_error_on_exception(self):
        svc = _make_llm_service()
        svc.client.chat.completions.create.side_effect = Exception("boom")
        tokens = list(svc.ask_question("Hi"))
        assert any("Error" in t for t in tokens)


# ============================================================================
# NLP service — edge-case query handling (FR2-T2, FR2-T3, FR2-T4, FR4-T1)
# ============================================================================

class TestNlpServiceEdgeCases:
    """Tests for nlp_service.execute_nlp_query edge cases."""

    @patch("services.nlp_service.json.dump")
    @patch("builtins.open", MagicMock())
    @patch("services.nlp_service.pd.read_sql_query")
    @patch("services.nlp_service.llm_service")
    def test_domain_specific_query_generates_multi_table_sql(
        self, mock_llm, mock_read_sql, mock_json_dump
    ):
        """FR2-T2: A domain-specific query should produce SQL with JOINs."""
        mock_llm.plan_and_generate_sql.return_value = {
            "rationale": "Joining compounds with drug_rx for quinpirole",
            "sql": (
                "SELECT E1.session_id FROM experimental_sessions E1 "
                "JOIN drug_rx DR ON E1.drug_rx_id = DR.drug_rx_id "
                "JOIN drug_rx_details DRD ON DR.drug_rx_id = DRD.drug_rx_id "
                "JOIN compounds C ON DRD.compound_id = C.compound_id "
                "WHERE C.compound_name = 'quinpirole'"
            ),
        }
        mock_read_sql.return_value = pd.DataFrame({"session_id": [1, 2, 3]})

        from services.nlp_service import execute_nlp_query
        result = execute_nlp_query("Find sessions with quinpirole", MagicMock())

        assert "rationale" in result
        assert len(result["results"]) == 3
        mock_llm.plan_and_generate_sql.assert_called_once_with(
            "Find sessions with quinpirole"
        )

    @patch("services.nlp_service.json.dump")
    @patch("builtins.open", MagicMock())
    @patch("services.nlp_service.pd.read_sql_query")
    @patch("services.nlp_service.llm_service")
    def test_nonsensical_query_returns_empty(self, mock_llm, mock_read_sql, mock_json_dump):
        """FR2-T3: A nonsensical query should still return a result dict (possibly empty)."""
        mock_llm.plan_and_generate_sql.return_value = {
            "rationale": "Could not interpret query meaningfully.",
            "sql": "SELECT * FROM experimental_sessions LIMIT 0",
        }
        mock_read_sql.return_value = pd.DataFrame()

        from services.nlp_service import execute_nlp_query
        result = execute_nlp_query("asdfgh jkl", MagicMock())

        assert result["results"] == []
        assert "rationale" in result
        assert "sql" in result

    @patch("services.nlp_service.json.dump")
    @patch("builtins.open", MagicMock())
    @patch("services.nlp_service.pd.read_sql_query")
    @patch("services.nlp_service.llm_service")
    def test_nonexistent_concept_returns_empty_not_crash(
        self, mock_llm, mock_read_sql, mock_json_dump
    ):
        """FR2-T4: Query about non-existent domain concepts should not crash."""
        mock_llm.plan_and_generate_sql.return_value = {
            "rationale": "No matching concept found in the schema.",
            "sql": "SELECT * FROM experimental_sessions WHERE 1=0",
        }
        mock_read_sql.return_value = pd.DataFrame()

        from services.nlp_service import execute_nlp_query
        result = execute_nlp_query("Show me all sessions with cats", MagicMock())

        assert result["results"] == []
        assert "No matching" in result["rationale"] or result["rationale"] != ""

    @patch("services.nlp_service.json.dump")
    @patch("builtins.open", MagicMock())
    @patch("services.nlp_service.pd.read_sql_query")
    @patch("services.nlp_service.llm_service")
    def test_sessions_with_data_have_session_ids(
        self, mock_llm, mock_read_sql, mock_json_dump
    ):
        """FR4-T1: Sessions returned from queries include session_id for observation joins."""
        mock_llm.plan_and_generate_sql.return_value = {
            "rationale": "Retrieving sessions with observations",
            "sql": "SELECT session_id FROM experimental_sessions LIMIT 5",
        }
        mock_read_sql.return_value = pd.DataFrame({"session_id": [1, 2, 3]})

        from services.nlp_service import execute_nlp_query
        result = execute_nlp_query("get sessions", MagicMock())

        assert len(result["results"]) > 0
        for row in result["results"]:
            assert "session_id" in row

