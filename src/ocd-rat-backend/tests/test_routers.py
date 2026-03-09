"""
FastAPI integration tests using TestClient with mocked dependencies.
Tests exercise the full router → service path but with mocked DB and LLM.
"""

import pytest
import json
from unittest.mock import patch, MagicMock
import pandas as pd


# ============================================================================
# Root endpoint
# ============================================================================

class TestRootEndpoint:
    def test_health_check(self, test_client):
        resp = test_client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"


# ============================================================================
# Filters router
# ============================================================================

class TestFiltersRouter:
    @patch("services.filter_service.pd.read_sql_query")
    def test_valid_filter_returns_200(self, mock_read_sql, test_client):
        mock_read_sql.return_value = pd.DataFrame({"session_id": [1], "rat_id": [8]})
        resp = test_client.post("/filters/", json={
            "filters": [{"id": "1", "field": "rat_id", "operator": "equal", "value": "8"}]
        })
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 1

    @patch("services.filter_service.pd.read_sql_query")
    def test_empty_filters_returns_200(self, mock_read_sql, test_client):
        mock_read_sql.return_value = pd.DataFrame()
        resp = test_client.post("/filters/", json={"filters": []})
        assert resp.status_code == 200

    def test_invalid_operator_returns_422(self, test_client):
        """Pydantic rejects invalid operator before hitting the service."""
        resp = test_client.post("/filters/", json={
            "filters": [{"id": "1", "field": "rat_id", "operator": "BADOP", "value": "1"}]
        })
        assert resp.status_code == 422


# ============================================================================
# NLP router
# ============================================================================

class TestNlpRouter:
    @patch("services.nlp_service.llm_service")
    @patch("services.nlp_service.pd.read_sql_query")
    def test_nlp_query_returns_result(self, mock_read_sql, mock_llm, test_client):
        mock_llm.plan_and_generate_sql.return_value = {
            "rationale": "Get all rats",
            "sql": "SELECT * FROM rats",
        }
        mock_read_sql.return_value = pd.DataFrame({"rat_id": [1, 2]})
        resp = test_client.get("/nlp/", params={"text": "show me all rats"})
        assert resp.status_code == 200
        data = resp.json()
        assert "rationale" in data
        assert "sql" in data
        assert "results" in data


# ============================================================================
# Ask router
# ============================================================================

class TestAskRouter:
    @patch("routers.ask.llm_service")
    def test_ask_returns_streaming(self, mock_llm, test_client):
        mock_llm.ask_question.return_value = iter(["Hello ", "world"])
        resp = test_client.post("/ask/", json={"question": "What is OCD?"})
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]
        body = resp.text
        assert "data:" in body
        assert "[DONE]" in body


# ============================================================================
# Visualizations router
# ============================================================================

class TestVisualizationsRouter:
    @patch("services.visualization_service.get_available_observation_codes")
    def test_available_returns_200(self, mock_obs_codes, test_client):
        mock_obs_codes.return_value = [{"code": "rearing", "label": "rearing"}]
        resp = test_client.get("/visualizations/available")
        assert resp.status_code == 200
        data = resp.json()
        assert "x_axis_options" in data
        assert "y_axis_options" in data

    @patch("routers.visualizations.generate_barchart_data")
    def test_barchart_valid_params(self, mock_gen, test_client):
        mock_gen.return_value = {
            "labels": ["A", "B"],
            "values": [10, 20],
            "title": "Test",
            "xlabel": "X",
            "ylabel": "Y",
            "unit": "count",
            "raw_data": [],
        }
        resp = test_client.get("/visualizations/barchart", params={
            "x_axis": "rat_strain",
            "y_axis": "session_count",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "title" in data
        assert "labels" in data

    @patch("services.visualization_service.generate_barchart_data")
    def test_barchart_invalid_x_axis_returns_400(self, mock_gen, test_client):
        mock_gen.side_effect = ValueError("Invalid x_axis")
        resp = test_client.get("/visualizations/barchart", params={
            "x_axis": "bad_value",
            "y_axis": "session_count",
        })
        assert resp.status_code == 400

    @patch("services.visualization_service.generate_linechart_data")
    def test_linechart_valid_params(self, mock_gen, test_client):
        mock_gen.return_value = {
            "labels": ["2025-01-01"],
            "values": [5],
            "title": "Over Time",
            "xlabel": "Date",
            "ylabel": "Count",
            "unit": "count",
            "raw_data": [],
        }
        resp = test_client.get("/visualizations/linechart", params={
            "x_axis": "date_by_month",
            "y_axis": "session_count",
        })
        assert resp.status_code == 200

    @patch("services.visualization_service.generate_linechart_data")
    def test_linechart_invalid_returns_400(self, mock_gen, test_client):
        mock_gen.side_effect = ValueError("Invalid")
        resp = test_client.get("/visualizations/linechart", params={
            "x_axis": "bad",
            "y_axis": "session_count",
        })
        assert resp.status_code == 400

    @patch("services.visualization_service.generate_heatmap_data")
    def test_heatmap_valid_params(self, mock_gen, test_client):
        mock_gen.return_value = {
            "title": "Heatmap",
            "xlabel": "X",
            "ylabel": "Y",
            "metric": "session_count",
            "unit": "count",
            "data": [],
            "x_categories": [],
            "y_categories": [],
            "min_value": 0,
            "max_value": 0,
            "raw_data": [],
        }
        resp = test_client.get("/visualizations/heatmap", params={
            "x_axis": "rat_strain",
            "y_axis": "tester",
            "metric": "session_count",
        })
        assert resp.status_code == 200

    def test_heatmap_same_axes_returns_400(self, test_client):
        resp = test_client.get("/visualizations/heatmap", params={
            "x_axis": "rat_strain",
            "y_axis": "rat_strain",
            "metric": "session_count",
        })
        assert resp.status_code == 400


# ============================================================================
# Inventory router
# ============================================================================

class TestInventoryRouter:
    @patch("services.inventory_service.pd.read_sql_query")
    def test_counts_returns_200(self, mock_read_sql, test_client):
        mock_read_sql.side_effect = [
            pd.DataFrame({
                "object_type_id": [1],
                "object_type_name": ["CSV"],
                "file_count": [10],
                "session_count": [5],
            }),
            pd.DataFrame({"n": [50]}),
        ]
        resp = test_client.post("/inventory/counts", json={})
        assert resp.status_code == 200
        data = resp.json()
        assert "total_sessions" in data
        assert "counts_by_type" in data

    @patch("services.inventory_service.pd.read_sql_query")
    @patch("builtins.open", create=True)
    def test_sessions_returns_200(self, mock_open, mock_read_sql, test_client):
        mock_read_sql.return_value = pd.DataFrame({
            "session_id": [1, 2],
            "legacy_session_id": ["A1", "A2"],
            "session_timestamp": [None, None],
            "rat_id": [3, 4],
            "apparatus_name": [None, None],
            "type_name": [None, None],
            "rx_label": [None, None],
            "surgery_type": [None, None],
            "region_name": [None, None],
            "pattern_description": [None, None],
            "cumulative_drug_injection_number": [None, None],
        })
        resp = test_client.post("/inventory/sessions", json={})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    @patch("services.inventory_filter_options.pd.read_sql_query")
    def test_filter_options_returns_200(self, mock_read_sql, test_client):
        mock_read_sql.return_value = pd.DataFrame({"id": [1], "label": ["Test"]})
        resp = test_client.get("/inventory/filter-options")
        assert resp.status_code == 200
        data = resp.json()
        assert "drugs" in data or "apparatuses" in data
