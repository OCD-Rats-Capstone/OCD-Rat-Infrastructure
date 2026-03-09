"""
Shared pytest fixtures for ocd-rat-backend tests.

Provides mock database connections, a FastAPI TestClient with
dependency overrides, and a mock LLM service — so no live DB
or external API is ever needed.
"""

import os
import pytest
from unittest.mock import MagicMock, patch

# ── Set dummy env vars BEFORE any application code is imported ──────────
# The LLM singleton instantiates OpenAI() at module scope, which blows up
# without OPENAI_API_KEY.  We set a dummy value so the import succeeds.
os.environ.setdefault("OPENAI_API_KEY", "test-key-for-unit-tests")
os.environ.setdefault("LLM_BASE_URL", "http://localhost:9999")
os.environ.setdefault("LLM_MODEL", "test-model")

from fastapi.testclient import TestClient
from core.database import get_db


# ---------------------------------------------------------------------------
# Mock database connection
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_cursor():
    """A MagicMock psycopg2 cursor with sensible defaults."""
    cursor = MagicMock()
    cursor.fetchall.return_value = []
    cursor.description = []
    return cursor


@pytest.fixture
def mock_db_connection(mock_cursor):
    """A MagicMock psycopg2 connection whose .cursor() returns mock_cursor."""
    conn = MagicMock()
    conn.cursor.return_value = mock_cursor
    return conn


# ---------------------------------------------------------------------------
# FastAPI TestClient with overridden DB dependency
# ---------------------------------------------------------------------------

@pytest.fixture
def test_client(mock_db_connection):
    """
    A FastAPI TestClient where `get_db` is replaced by the mock connection.
    Import `app` inside the fixture so module-level side-effects (like the
    LLM singleton) can be patched first when needed.
    """
    from app import app

    def _override_get_db():
        yield mock_db_connection

    app.dependency_overrides[get_db] = _override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Mock LLM service
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_llm_service():
    """Patch the llm_service singleton so no real API calls are made."""
    with patch("llm.llm_service.llm_service") as mock_svc:
        yield mock_svc
