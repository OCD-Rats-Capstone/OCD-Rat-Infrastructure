"""
Tests for services/visualization_service.py — registry integrity,
query builders, and validation logic.
"""

import pytest
from unittest.mock import MagicMock

from services.visualization_service import (
    # Registries
    X_AXIS_REGISTRY,
    Y_AXIS_REGISTRY,
    LINECHART_X_AXIS_REGISTRY,
    LINECHART_Y_AXIS_REGISTRY,
    HEATMAP_X_AXIS_REGISTRY,
    HEATMAP_Y_AXIS_REGISTRY,
    HEATMAP_METRIC_REGISTRY,
    # Config dataclasses
    XAxisConfig,
    YAxisConfig,
    # Enums
    XAxisType,
    YAxisType,
    XAxisLineChartType,
    YAxisLineChartType,
    # Functions
    get_available_visualizations,
    _build_from_clause,
    _build_where_clause,
    _build_query,
    _build_linechart_query,
    _build_heatmap_query,
    generate_barchart_data,
    generate_linechart_data,
    generate_heatmap_data,
)


# ============================================================================
# Registry Integrity
# ============================================================================

class TestRegistries:
    """Ensure registries are properly populated and typed."""

    def test_x_axis_registry_nonempty(self):
        assert len(X_AXIS_REGISTRY) > 0

    def test_y_axis_registry_nonempty(self):
        assert len(Y_AXIS_REGISTRY) > 0

    def test_x_axis_entries_are_configs(self):
        for key, config in X_AXIS_REGISTRY.items():
            assert isinstance(config, XAxisConfig), f"{key} is not XAxisConfig"

    def test_y_axis_entries_are_configs(self):
        for key, config in Y_AXIS_REGISTRY.items():
            assert isinstance(config, YAxisConfig), f"{key} is not YAxisConfig"

    def test_x_axis_ids_match_keys(self):
        for key, config in X_AXIS_REGISTRY.items():
            assert config.id == key

    def test_y_axis_ids_match_keys(self):
        for key, config in Y_AXIS_REGISTRY.items():
            assert config.id == key

    def test_linechart_registries_nonempty(self):
        assert len(LINECHART_X_AXIS_REGISTRY) > 0
        assert len(LINECHART_Y_AXIS_REGISTRY) > 0

    def test_heatmap_registries_share_barchart(self):
        """Heatmap axes reuse the bar chart registries."""
        assert HEATMAP_X_AXIS_REGISTRY is X_AXIS_REGISTRY
        assert HEATMAP_METRIC_REGISTRY is Y_AXIS_REGISTRY


# ============================================================================
# get_available_visualizations
# ============================================================================

class TestGetAvailableVisualizations:
    def test_returns_all_keys(self):
        result = get_available_visualizations()
        expected_keys = {
            "x_axis_options",
            "y_axis_options",
            "linechart_x_axis_options",
            "linechart_y_axis_options",
            "heatmap_x_axis_options",
            "heatmap_y_axis_options",
            "heatmap_metric_options",
        }
        assert set(result.keys()) == expected_keys

    def test_x_axis_options_nonempty(self):
        result = get_available_visualizations()
        assert len(result["x_axis_options"]) > 0

    def test_option_structure(self):
        result = get_available_visualizations()
        opt = result["x_axis_options"][0]
        assert "id" in opt
        assert "label" in opt
        assert "description" in opt

    def test_y_axis_has_unit(self):
        result = get_available_visualizations()
        opt = result["y_axis_options"][0]
        assert "unit" in opt


# ============================================================================
# _build_from_clause
# ============================================================================

class TestBuildFromClause:
    def test_empty_joins(self):
        clause = _build_from_clause(set())
        assert "FROM experimental_sessions AS E1" in clause
        assert "JOIN" not in clause

    def test_single_join_r1(self):
        clause = _build_from_clause({"R1"})
        assert "LEFT JOIN rats AS R1" in clause

    def test_multiple_joins(self):
        clause = _build_from_clause({"R1", "T1"})
        assert "LEFT JOIN rats AS R1" in clause
        assert "LEFT JOIN testers AS T1" in clause

    def test_drug_dependency_chain(self):
        """D1 requires DRD requires DR — all should appear when D1 is requested."""
        clause = _build_from_clause({"D1", "DRD", "DR"})
        assert "drug_rx AS DR" in clause
        assert "drug_rx_details AS DRD" in clause
        assert "drugs AS D1" in clause

    def test_join_order_preserved(self):
        """Joins must appear in dependency order — DR before DRD before D1."""
        clause = _build_from_clause({"D1", "DRD", "DR"})
        dr_pos = clause.index("drug_rx AS DR")
        drd_pos = clause.index("drug_rx_details AS DRD")
        d1_pos = clause.index("drugs AS D1")
        assert dr_pos < drd_pos < d1_pos


# ============================================================================
# _build_where_clause (visualization version)
# ============================================================================

class TestVizBuildWhereClause:
    def test_default_without_observation(self):
        clause = _build_where_clause(set())
        assert "E1.session_id IS NOT NULL" in clause

    def test_with_observation_code(self):
        clause = _build_where_clause({"OBS"}, observation_code="rearing")
        assert "OBS.observation_code = 'rearing'" in clause

    def test_observation_code_sql_injection_escaped(self):
        clause = _build_where_clause({"OBS"}, observation_code="test'; DROP TABLE--")
        assert "test''; DROP TABLE--" in clause


# ============================================================================
# _build_query
# ============================================================================

class TestBuildQuery:
    def test_produces_select_group_order(self):
        x_config = X_AXIS_REGISTRY["rat_strain"]
        y_config = Y_AXIS_REGISTRY["session_count"]
        query = _build_query(x_config, y_config)
        assert "SELECT" in query
        assert "GROUP BY" in query
        assert "ORDER BY" in query
        assert "FROM experimental_sessions" in query


# ============================================================================
# _build_linechart_query
# ============================================================================

class TestBuildLinechartQuery:
    def test_time_based_grouping(self):
        x_config = LINECHART_X_AXIS_REGISTRY["date_by_month"]
        y_config = LINECHART_Y_AXIS_REGISTRY["session_count"]
        query = _build_linechart_query(x_config, y_config)
        assert "DATE_TRUNC" in query
        assert "GROUP BY" in query


# ============================================================================
# _build_heatmap_query
# ============================================================================

class TestBuildHeatmapQuery:
    def test_two_dimensional_grouping(self):
        x_config = X_AXIS_REGISTRY["rat_strain"]
        y_config = X_AXIS_REGISTRY["tester"]
        m_config = Y_AXIS_REGISTRY["session_count"]
        query = _build_heatmap_query(x_config, y_config, m_config)
        assert "x_cat" in query
        assert "y_cat" in query
        assert "GROUP BY" in query


# ============================================================================
# Validation in generate_* functions
# ============================================================================

class TestBarchartValidation:
    def test_invalid_x_axis_raises(self):
        with pytest.raises(ValueError, match="Invalid x_axis"):
            generate_barchart_data(MagicMock(), x_axis="nonexistent", y_axis="session_count")

    def test_invalid_y_axis_raises(self):
        with pytest.raises(ValueError, match="Invalid y_axis"):
            generate_barchart_data(MagicMock(), x_axis="rat_strain", y_axis="nonexistent")


class TestLinechartValidation:
    def test_invalid_x_axis_raises(self):
        with pytest.raises(ValueError, match="Invalid x_axis"):
            generate_linechart_data(MagicMock(), x_axis="bad", y_axis="session_count")

    def test_invalid_y_axis_raises(self):
        with pytest.raises(ValueError, match="Invalid y_axis"):
            generate_linechart_data(MagicMock(), x_axis="date_by_day", y_axis="bad")


class TestHeatmapValidation:
    def test_invalid_x_axis_raises(self):
        with pytest.raises(ValueError, match="Invalid x_axis"):
            generate_heatmap_data(MagicMock(), x_axis="bad", y_axis="tester", metric="session_count")

    def test_invalid_y_axis_raises(self):
        with pytest.raises(ValueError, match="Invalid y_axis"):
            generate_heatmap_data(MagicMock(), x_axis="rat_strain", y_axis="bad", metric="session_count")

    def test_invalid_metric_raises(self):
        with pytest.raises(ValueError, match="Invalid metric"):
            generate_heatmap_data(MagicMock(), x_axis="rat_strain", y_axis="tester", metric="bad")

    def test_same_x_y_raises(self):
        with pytest.raises(ValueError, match="different dimensions"):
            generate_heatmap_data(MagicMock(), x_axis="rat_strain", y_axis="rat_strain", metric="session_count")


# ============================================================================
# Behavioral observation filtering (FR4-T2, FR4-T3)
# ============================================================================

class TestObservationCodeFiltering:
    """Tests for observation code WHERE clause logic."""

    def test_observation_code_included_in_clause(self):
        """FR4-T2: Observation code filter appears in WHERE clause."""
        clause = _build_where_clause(set(), observation_code="rearing")
        assert "observation_code" in clause.lower()
        assert "rearing" in clause.lower()

    def test_no_observation_code_omits_filter(self):
        """FR4-T3: Without observation code, clause omits that filter."""
        clause = _build_where_clause(set(), observation_code=None)
        assert "observation_code" not in clause.lower()


# ============================================================================
# Empty-set visualization (FR5-T4)
# ============================================================================

class TestVisualizationEmptySet:
    """Tests that visualization functions handle empty result sets gracefully."""

    def test_barchart_empty_result_returns_empty_structure(self):
        """FR5-T4: generate_barchart_data returns empty labels/values for zero rows."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = []
        mock_cursor.description = [("label", None), ("value", None)]
        mock_conn.cursor.return_value = mock_cursor

        result = generate_barchart_data(mock_conn, "rat_strain", "session_count")

        assert result["labels"] == []
        assert result["values"] == []
        assert result["raw_data"] == []
        assert "title" in result

    def test_linechart_empty_result_returns_empty_structure(self):
        """FR5-T4 (linechart): Empty result handled gracefully."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = []
        mock_cursor.description = [("period", None), ("value", None)]
        mock_conn.cursor.return_value = mock_cursor

        result = generate_linechart_data(mock_conn, "date_by_month", "session_count")

        assert result["labels"] == []
        assert result["values"] == []

    def test_heatmap_empty_result_returns_empty_structure(self):
        """FR5-T4 (heatmap): Empty result handled gracefully."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = []
        mock_cursor.description = [("x", None), ("y", None), ("val", None)]
        mock_conn.cursor.return_value = mock_cursor

        result = generate_heatmap_data(mock_conn, "rat_strain", "apparatus", "session_count")

        assert result["x_categories"] == []
        assert result["y_categories"] == []
        assert result["data"] == []
