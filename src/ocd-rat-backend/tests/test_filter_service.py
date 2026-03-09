"""
Tests for services/filter_service.py — the SQL WHERE-clause builder.
"""

import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np

from schemas.query import FilterItem
from services.filter_service import (
    _build_where_clause,
    execute_filter_query,
    OPERATORS,
    FIELD_MAPPINGS,
    BASE_QUERY,
)


# ============================================================================
# _build_where_clause
# ============================================================================

class TestBuildWhereClause:
    """Unit tests for the WHERE-clause builder (pure logic, no DB)."""

    def test_empty_filters_returns_empty(self):
        clause, params = _build_where_clause([])
        assert clause == ""
        assert params == []

    def test_single_equal_filter(self):
        f = FilterItem(id="1", field="rat_id", operator="equal", value="8")
        clause, params = _build_where_clause([f])
        assert "= %s" in clause
        assert params == ["8"]

    @pytest.mark.parametrize("op,sql_op", [
        ("gte", ">="),
        ("lte", "<="),
        ("gt", ">"),
        ("lt", "<"),
    ])
    def test_comparison_operators(self, op, sql_op):
        f = FilterItem(id="1", field="session_id", operator=op, value="100")
        clause, params = _build_where_clause([f])
        assert sql_op in clause
        assert params == ["100"]

    def test_range_operator(self):
        f = FilterItem(id="1", field="body_weight_grams", operator="range", value="100$200")
        clause, params = _build_where_clause([f])
        assert ">= %s" in clause
        assert "<= %s" in clause
        assert params == ["100", "200"]

    def test_range_invalid_format_raises(self):
        f = FilterItem(id="1", field="body_weight_grams", operator="range", value="only_one")
        with pytest.raises(ValueError, match="low\\$high"):
            _build_where_clause([f])

    def test_field_mapping_resolution(self):
        """'rat' should map to 'E1.rat_id' via FIELD_MAPPINGS."""
        f = FilterItem(id="1", field="rat", operator="equal", value="5")
        clause, _ = _build_where_clause([f])
        assert "E1.rat_id" in clause

    def test_unmapped_field_defaults_to_e1(self):
        f = FilterItem(id="1", field="body_weight_grams", operator="gt", value="100")
        clause, _ = _build_where_clause([f])
        assert "E1.body_weight_grams" in clause

    def test_multiple_filters_anded(self):
        filters = [
            FilterItem(id="1", field="rat_id", operator="equal", value="8"),
            FilterItem(id="2", field="session_id", operator="gte", value="100"),
        ]
        clause, params = _build_where_clause(filters)
        assert " AND " in clause
        assert len(params) == 2

    def test_where_keyword_present(self):
        f = FilterItem(id="1", field="rat_id", operator="equal", value="1")
        clause, _ = _build_where_clause([f])
        assert clause.strip().startswith("WHERE")


# ============================================================================
# execute_filter_query
# ============================================================================

class TestExecuteFilterQuery:
    """Tests for the full query execution path (DB is mocked via pandas)."""

    @patch("services.filter_service.pd.read_sql_query")
    def test_returns_dataframe(self, mock_read_sql):
        mock_read_sql.return_value = pd.DataFrame({"session_id": [1, 2], "rat_id": [3, 4]})
        filters = [FilterItem(id="1", field="rat_id", operator="equal", value="3")]
        result = execute_filter_query(filters, MagicMock())
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 2

    @patch("services.filter_service.pd.read_sql_query")
    def test_nan_inf_replaced(self, mock_read_sql):
        mock_read_sql.return_value = pd.DataFrame({"val": [np.nan, np.inf, -np.inf, 5.0]})
        result = execute_filter_query([], MagicMock())
        assert "None" in result["val"].values
        assert np.inf not in result["val"].values

    @patch("services.filter_service.pd.read_sql_query")
    def test_empty_result(self, mock_read_sql):
        mock_read_sql.return_value = pd.DataFrame()
        result = execute_filter_query([], MagicMock())
        assert len(result) == 0

    @patch("services.filter_service.pd.read_sql_query")
    def test_query_uses_base_query(self, mock_read_sql):
        mock_read_sql.return_value = pd.DataFrame()
        execute_filter_query([], MagicMock())
        called_query = mock_read_sql.call_args[0][0]
        assert "experimental_sessions" in called_query
