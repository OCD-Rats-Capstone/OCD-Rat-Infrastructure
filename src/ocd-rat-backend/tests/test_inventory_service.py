"""
Tests for services/inventory_service.py — the CTE filter builder and counts logic.
"""

import pytest
from unittest.mock import patch, MagicMock
import pandas as pd

from schemas.query import InventoryCountsRequest, InventoryCountsResponse
from services.inventory_service import (
    _build_filtered_sessions_sql,
    get_inventory_counts,
    get_inventory_sessions,
)


# ============================================================================
# _build_filtered_sessions_sql
# ============================================================================

class TestBuildFilteredSessionsSql:
    """Tests for the CTE builder — pure logic, no DB."""

    def test_no_filters_base_condition(self):
        req = InventoryCountsRequest()
        sql, params = _build_filtered_sessions_sql(req)
        assert "1=1" in sql
        assert params == []

    def test_apparatus_id_filter(self):
        req = InventoryCountsRequest(apparatus_id=5)
        sql, params = _build_filtered_sessions_sql(req)
        assert "E.apparatus_id = %s" in sql
        assert 5 in params

    def test_pattern_id_filter(self):
        req = InventoryCountsRequest(pattern_id=3)
        sql, params = _build_filtered_sessions_sql(req)
        assert "E.pattern_id = %s" in sql
        assert 3 in params

    def test_session_type_filter(self):
        req = InventoryCountsRequest(session_type_id=2)
        sql, params = _build_filtered_sessions_sql(req)
        assert "E.session_type_id = %s" in sql
        assert 2 in params

    def test_room_id_filter(self):
        req = InventoryCountsRequest(room_id=1)
        sql, params = _build_filtered_sessions_sql(req)
        assert "E.room_id = %s" in sql

    def test_drug_ids_having_clause(self):
        req = InventoryCountsRequest(drug_ids=[10, 20])
        sql, params = _build_filtered_sessions_sql(req)
        assert "HAVING COUNT(DISTINCT drug_id) = %s" in sql
        assert 10 in params
        assert 20 in params
        assert len(req.drug_ids) in params  # The count parameter

    def test_file_type_ids_having_clause(self):
        req = InventoryCountsRequest(file_type_ids=[1, 2, 3])
        sql, params = _build_filtered_sessions_sql(req)
        assert "HAVING COUNT(DISTINCT object_type_id) = %s" in sql
        assert len(req.file_type_ids) in params

    def test_rx_ids_in_clause(self):
        req = InventoryCountsRequest(rx_ids=[100, 200])
        sql, params = _build_filtered_sessions_sql(req)
        assert "E.drug_rx_id IN" in sql
        assert 100 in params
        assert 200 in params

    def test_surgery_type_adds_brain_join(self):
        req = InventoryCountsRequest(surgery_type="Lesion")
        sql, params = _build_filtered_sessions_sql(req)
        assert "brain_manipulations" in sql
        assert "Lesion" in params

    def test_target_region_adds_brain_join(self):
        req = InventoryCountsRequest(target_region_id=7)
        sql, params = _build_filtered_sessions_sql(req)
        assert "brain_manipulations" in sql
        assert 7 in params

    def test_multiple_filters_combined(self):
        req = InventoryCountsRequest(apparatus_id=1, session_type_id=2, room_id=3)
        sql, params = _build_filtered_sessions_sql(req)
        assert "E.apparatus_id = %s" in sql
        assert "E.session_type_id = %s" in sql
        assert "E.room_id = %s" in sql
        assert params == [1, 2, 3]

    def test_cte_structure(self):
        req = InventoryCountsRequest()
        sql, _ = _build_filtered_sessions_sql(req)
        assert "WITH filtered_sessions AS" in sql
        assert "SELECT E.session_id" in sql


# ============================================================================
# get_inventory_counts
# ============================================================================

class TestGetInventoryCounts:
    @patch("services.inventory_service.pd.read_sql_query")
    def test_returns_response_model(self, mock_read_sql):
        # First call: counts query, second call: total query
        mock_read_sql.side_effect = [
            pd.DataFrame({
                "object_type_id": [1],
                "object_type_name": ["CSV"],
                "file_count": [10],
                "session_count": [5],
            }),
            pd.DataFrame({"n": [100]}),
        ]
        req = InventoryCountsRequest()
        result = get_inventory_counts(req, MagicMock())
        assert isinstance(result, InventoryCountsResponse)
        assert result.total_sessions == 100
        assert len(result.counts_by_type) == 1

    @patch("services.inventory_service.pd.read_sql_query")
    def test_empty_result(self, mock_read_sql):
        mock_read_sql.side_effect = [
            pd.DataFrame(columns=["object_type_id", "object_type_name", "file_count", "session_count"]),
            pd.DataFrame({"n": [0]}),
        ]
        req = InventoryCountsRequest()
        result = get_inventory_counts(req, MagicMock())
        assert result.total_sessions == 0
        assert result.counts_by_type == []


# ============================================================================
# Filter options completeness (FR3-T1, FR3-T3)
# ============================================================================

class TestFilterOptionsCompleteness:
    """Tests for filter options meeting FR3 browsing requirements."""

    @patch("services.inventory_filter_options.pd.read_sql_query")
    def test_returns_at_least_3_categories(self, mock_read_sql):
        """FR3-T1: filter_options must return >= 3 browsable category dimensions."""
        mock_read_sql.return_value = pd.DataFrame({"id": [1], "label": ["test"]})

        from services.inventory_filter_options import get_filter_options
        result = get_filter_options(MagicMock())

        assert isinstance(result, dict)
        assert len(result) >= 3, f"Expected >= 3 dimensions, got {len(result)}: {list(result.keys())}"

    @patch("services.inventory_filter_options.pd.read_sql_query")
    def test_all_dimensions_non_empty(self, mock_read_sql):
        """FR3-T3: Every dimension in the response must have >= 1 entry."""
        mock_read_sql.return_value = pd.DataFrame({"id": [1], "label": ["sample"]})

        from services.inventory_filter_options import get_filter_options
        result = get_filter_options(MagicMock())

        for key, entries in result.items():
            assert len(entries) >= 1, f"Dimension '{key}' is empty"

    @patch("services.inventory_filter_options.pd.read_sql_query")
    def test_expected_dimension_keys_present(self, mock_read_sql):
        """FR3-T1: All expected browsing dimensions are returned."""
        mock_read_sql.return_value = pd.DataFrame({"id": [1], "label": ["x"]})

        from services.inventory_filter_options import get_filter_options
        result = get_filter_options(MagicMock())

        expected_keys = {
            "drugs", "apparatuses", "apparatus_patterns",
            "session_types", "surgery_types", "brain_regions", "testing_rooms",
        }
        assert expected_keys.issubset(set(result.keys())), (
            f"Missing dimensions: {expected_keys - set(result.keys())}"
        )
