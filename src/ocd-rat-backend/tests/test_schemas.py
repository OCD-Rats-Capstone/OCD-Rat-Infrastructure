"""
Tests for Pydantic models in schemas/query.py and schemas/visualization.py.
"""

import pytest
from pydantic import ValidationError

from schemas.query import (
    FilterItem,
    FilterRequest,
    AskRequest,
    InventoryCountsRequest,
    InventoryCountsResponse,
    DataTypeCount,
    INVENTORY_SESSIONS_LIMIT,
)
from schemas.visualization import (
    BarChartDataRequest,
    VisualizationDataResponse,
    XAxisOption,
    YAxisOption,
    ObservationCode,
    AvailableVisualizationsResponse,
)


# ============================================================================
# FilterItem
# ============================================================================

class TestFilterItem:
    """Tests for the FilterItem schema."""

    def test_valid_creation(self):
        item = FilterItem(id="1", field="rat_id", operator="equal", value="8")
        assert item.field == "rat_id"
        assert item.operator == "equal"

    @pytest.mark.parametrize("op", ["equal", "gte", "lte", "gt", "lt", "range"])
    def test_all_valid_operators(self, op):
        item = FilterItem(id="1", field="session_id", operator=op, value="10")
        assert item.operator == op

    def test_invalid_operator_rejected(self):
        with pytest.raises(ValidationError):
            FilterItem(id="1", field="rat_id", operator="LIKE", value="8")

    def test_field_with_underscores_allowed(self):
        item = FilterItem(id="1", field="body_weight_grams", operator="gte", value="100")
        assert item.field == "body_weight_grams"

    def test_field_sql_injection_rejected(self):
        with pytest.raises(ValidationError):
            FilterItem(id="1", field="rat_id; DROP TABLE", operator="equal", value="1")

    def test_field_with_special_chars_rejected(self):
        with pytest.raises(ValidationError):
            FilterItem(id="1", field="rat-id", operator="equal", value="1")

    def test_range_value_format(self):
        """Range values use '$' separator — schema accepts any string, parsing happens in service."""
        item = FilterItem(id="1", field="body_weight_grams", operator="range", value="100$200")
        assert item.value == "100$200"


# ============================================================================
# FilterRequest
# ============================================================================

class TestFilterRequest:
    def test_empty_filters_list(self):
        req = FilterRequest(filters=[])
        assert req.filters == []

    def test_multiple_filters(self):
        filters = [
            FilterItem(id="1", field="rat_id", operator="equal", value="8"),
            FilterItem(id="2", field="session_id", operator="gte", value="100"),
        ]
        req = FilterRequest(filters=filters)
        assert len(req.filters) == 2


# ============================================================================
# AskRequest
# ============================================================================

class TestAskRequest:
    def test_valid_question(self):
        req = AskRequest(question="What is OCD?")
        assert req.question == "What is OCD?"

    def test_empty_question_allowed(self):
        req = AskRequest(question="")
        assert req.question == ""


# ============================================================================
# Inventory Models
# ============================================================================

class TestInventoryModels:
    def test_counts_request_defaults(self):
        req = InventoryCountsRequest()
        assert req.drug_ids is None
        assert req.apparatus_id is None
        assert req.session_type_id is None

    def test_counts_request_with_filters(self):
        req = InventoryCountsRequest(drug_ids=[1, 2], apparatus_id=3)
        assert req.drug_ids == [1, 2]
        assert req.apparatus_id == 3

    def test_data_type_count(self):
        dtc = DataTypeCount(
            object_type_id=1,
            object_type_name="CSV",
            file_count=10,
            session_count=5,
        )
        assert dtc.file_count == 10

    def test_counts_response(self):
        resp = InventoryCountsResponse(
            total_sessions=100,
            counts_by_type=[
                DataTypeCount(object_type_id=1, object_type_name="CSV", file_count=50, session_count=30)
            ],
        )
        assert resp.total_sessions == 100
        assert len(resp.counts_by_type) == 1

    def test_sessions_limit_constant(self):
        assert INVENTORY_SESSIONS_LIMIT == 500


# ============================================================================
# Visualization Models
# ============================================================================

class TestVisualizationModels:
    def test_bar_chart_data_request(self):
        req = BarChartDataRequest(x_axis="rat_strain", y_axis="session_count")
        assert req.x_axis == "rat_strain"
        assert req.observation_code is None

    def test_visualization_data_response(self):
        resp = VisualizationDataResponse(
            labels=["A", "B"],
            values=[10.0, 20.0],
            title="Test",
            xlabel="X",
            ylabel="Y",
            unit="count",
            raw_data=[{"d": 1}],
        )
        assert resp.labels == ["A", "B"]
        assert resp.unit == "count"

    def test_available_visualizations_response(self):
        resp = AvailableVisualizationsResponse(
            x_axis_options=[XAxisOption(id="x", label="X", description="desc")],
            y_axis_options=[YAxisOption(id="y", label="Y", description="desc", unit="u")],
            linechart_x_axis_options=[],
            linechart_y_axis_options=[],
            heatmap_x_axis_options=[],
            heatmap_y_axis_options=[],
            heatmap_metric_options=[],
        )
        assert len(resp.x_axis_options) == 1
