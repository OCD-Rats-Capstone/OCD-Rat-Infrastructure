"""
Tests for the LLM module: prompt_builder.py, schema_inspector.py, and llm_service.py.
All external calls (DB, OpenAI) are mocked.
"""

import pytest
import json
import os
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
