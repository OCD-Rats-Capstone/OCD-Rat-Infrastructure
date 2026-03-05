"""
Tests for core/config.py and core/database.py.
"""

import pytest
from unittest.mock import patch, MagicMock


# ============================================================================
# Settings
# ============================================================================

class TestSettings:
    """Tests for the Pydantic Settings model."""

    def test_default_values(self):
        with patch.dict("os.environ", {}, clear=True):
            from core.config import Settings
            s = Settings()
            assert s.db_host == "localhost"
            assert s.db_name == "postgres"
            assert s.db_user == "postgres"
            assert s.db_port == "5432"

    def test_env_override(self):
        with patch.dict("os.environ", {"DB_HOST": "remotehost", "DB_PORT": "9999"}):
            from core.config import Settings
            s = Settings()
            assert s.db_host == "remotehost"
            assert s.db_port == "9999"

    def test_extra_fields_ignored(self):
        """Pydantic's Config.extra = 'ignore' means unknown env vars won't crash."""
        with patch.dict("os.environ", {"UNKNOWN_SETTING": "whatever"}):
            from core.config import Settings
            s = Settings()
            assert not hasattr(s, "unknown_setting")


# ============================================================================
# get_settings
# ============================================================================

class TestGetSettings:
    def test_returns_settings_instance(self):
        from core.config import Settings, get_settings
        # Clear lru_cache to get a fresh instance
        get_settings.cache_clear()
        result = get_settings()
        assert isinstance(result, Settings)

    def test_caching(self):
        from core.config import get_settings
        get_settings.cache_clear()
        a = get_settings()
        b = get_settings()
        assert a is b


# ============================================================================
# get_db
# ============================================================================

class TestGetDb:
    @patch("core.database.psycopg2.connect")
    def test_yields_connection(self, mock_connect):
        mock_conn = MagicMock()
        mock_connect.return_value = mock_conn

        from core.database import get_db
        gen = get_db()
        conn = next(gen)
        assert conn is mock_conn

    @patch("core.database.psycopg2.connect")
    def test_closes_on_exit(self, mock_connect):
        mock_conn = MagicMock()
        mock_connect.return_value = mock_conn

        from core.database import get_db
        gen = get_db()
        next(gen)
        try:
            gen.send(None)
        except StopIteration:
            pass
        mock_conn.close.assert_called_once()

    @patch("core.database.psycopg2.connect")
    def test_closes_on_exception(self, mock_connect):
        mock_conn = MagicMock()
        mock_connect.return_value = mock_conn

        from core.database import get_db
        gen = get_db()
        next(gen)
        try:
            gen.throw(RuntimeError, "boom")
        except RuntimeError:
            pass
        mock_conn.close.assert_called_once()
