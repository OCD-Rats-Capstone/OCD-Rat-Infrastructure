"""
Visualization Router - Endpoints for data visualization features.
Provides constrained data options for creating visualizations like barcharts.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from core.database import get_db
from schemas.visualization import (
    BarChartDataRequest,
    VisualizationDataResponse,
    AvailableVisualizationsResponse,
)
from services.visualization_service import (
    get_available_visualizations,
    generate_barchart_data,
    generate_linechart_data,
    generate_heatmap_data,
    get_available_observation_codes,
    VisualizationType,
)


router = APIRouter(prefix="/visualizations", tags=["Visualizations"])


@router.get("/available", response_model=AvailableVisualizationsResponse)
async def get_available_visualizations_endpoint(db=Depends(get_db)):
    """
    Get all available visualization types and their supported configurations.
    
    Returns:
        AvailableVisualizationsResponse containing:
        - x_axis_options: Supported X-axis grouping variables
        - y_axis_options: Supported Y-axis metrics
        
    Example response:
        {
            "x_axis_options": [
                {"id": "rat_strain", "label": "Rat Strain", "description": "..."},
                {"id": "tester", "label": "Tester", "description": "..."},
                ...
            ],
            "y_axis_options": [
                {"id": "session_count", "label": "Session Count", "description": "...", "unit": "count"},
                {"id": "avg_body_weight", "label": "Average Body Weight", "unit": "grams", ...},
                ...
            ]
        }
    """
    try:
        data = get_available_visualizations()
        # Also return observation codes for convenience
        data["observation_codes"] = get_available_observation_codes(db)
        return AvailableVisualizationsResponse(**data)
    except Exception as e:
        print(f"[Visualizations Router] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/barchart", response_model=VisualizationDataResponse)
async def generate_barchart(
    x_axis: str = Query(..., description="X-axis grouping variable (e.g., 'rat_strain', 'tester', 'apparatus')"),
    y_axis: str = Query(..., description="Y-axis metric (e.g., 'session_count', 'avg_body_weight', 'total_behavior_frequency')"),
    observation_code: str = Query(None, description="Optional observation code filter for behavioral metrics (required when y_axis='total_behavior_frequency' or 'avg_behavior_duration')"),
    db=Depends(get_db),
):
    """
    Generate data for a barchart visualization with flexible axes.
    
    Args:
        x_axis: The variable to group by (e.g., 'rat_strain', 'tester', 'apparatus', 'lighting_condition', 'drug_compound')
        y_axis: The metric to aggregate (e.g., 'session_count', 'avg_body_weight', 'unique_rats', 'avg_injection_count', 'total_behavior_frequency', 'avg_behavior_duration')
        observation_code: Optional filter for behavior observation codes. Required when y_axis is a behavioral metric.
        
    Returns:
        VisualizationDataResponse with:
        - labels: X-axis labels (x_axis variable values)
        - values: Y-axis values (aggregated metric)
        - title, xlabel, ylabel: Chart labels
        - unit: Unit of measurement for Y-axis
        - raw_data: Complete aggregated data
        
    Supported X-axis options:
        - rat_strain: Group by rat strain
        - rat_sex: Group by rat sex (male/female)
        - session_type: Group by session type (e.g., training, testing)
        - apparatus: Group by apparatus/equipment
        - lighting_condition: Group by lighting (on/off)
        - tester: Group by experimenter name
        - drug_compound: Group by pharmaceutical compound
        - brain_region: Group by brain region of surgery
        - manipulation_type: Group by manipulation type (surgery, lesion, etc.)
        
    Supported Y-axis options:
        - session_count: Number of sessions (count)
        - unique_rats: Number of unique rats (count)
        - avg_body_weight: Average body weight (grams)
        - avg_injection_count: Average injection count (count)
        - total_behavior_frequency: Total behavior frequency - REQUIRES observation_code filter (count)
        - avg_behavior_duration: Average behavior duration - REQUIRES observation_code filter (seconds)
        
    Examples:
        GET /visualizations/barchart?x_axis=rat_strain&y_axis=session_count
        → Sessions grouped by strain
        
        GET /visualizations/barchart?x_axis=apparatus&y_axis=avg_body_weight
        → Average body weight grouped by apparatus
        
        GET /visualizations/barchart?x_axis=tester&y_axis=total_behavior_frequency&observation_code=rearing
        → Total rearing frequency grouped by tester
        
    Response:
        {
            "labels": ["Strain A", "Strain B", "Strain C"],
            "values": [45, 52, 38],
            "title": "Number of Sessions by Rat Strain",
            "xlabel": "Rat Strain",
            "ylabel": "Session Count",
            "unit": "count",
            "raw_data": [...]
        }
    """
    try:
        data = generate_barchart_data(
            db_connection=db,
            x_axis=x_axis,
            y_axis=y_axis,
            observation_code=observation_code,
        )
        return VisualizationDataResponse(**data)
    except ValueError as e:
        # Validation errors (invalid x_axis, y_axis, missing observation_code, etc.)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[Visualizations Router] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/linechart", response_model=VisualizationDataResponse)
async def generate_linechart(
    x_axis: str = Query(..., description="Time binning option (e.g., 'date_by_day', 'date_by_week', 'date_by_month')"),
    y_axis: str = Query(..., description="Y-axis metric (e.g., 'session_count', 'avg_body_weight', 'unique_rats', 'avg_injection_count')"),
    db=Depends(get_db),
):
    """
    Generate data for a line chart visualization with time-based X-axis.
    
    Args:
        x_axis: Time binning option (e.g., 'date_by_day', 'date_by_week', 'date_by_month')
        y_axis: The metric to aggregate over time (e.g., 'session_count', 'avg_body_weight', 'unique_rats', 'avg_injection_count')
        
    Returns:
        VisualizationDataResponse with:
        - labels: Date labels (X-axis)
        - values: Y-axis values (aggregated metric per time period)
        - title, xlabel, ylabel: Chart labels
        - unit: Unit of measurement for Y-axis
        - raw_data: Complete aggregated data
        
    Supported X-axis options (time binning):
        - date_by_day: Aggregate by day
        - date_by_week: Aggregate by week
        - date_by_month: Aggregate by month
        
    Supported Y-axis options (metrics):
        - session_count: Number of sessions per time period
        - unique_rats: Number of unique rats per time period
        - avg_body_weight: Average body weight per time period (grams)
        - avg_injection_count: Average injection count per time period
        
    Examples:
        GET /visualizations/linechart?x_axis=date_by_month&y_axis=session_count
        → Sessions per month
        
        GET /visualizations/linechart?x_axis=date_by_week&y_axis=avg_body_weight
        → Average body weight per week
        
    Response:
        {
            "labels": ["2025-01-01", "2025-01-02", "2025-01-03"],
            "values": [10, 12, 8],
            "title": "Session Count Over Time",
            "xlabel": "Date (Daily)",
            "ylabel": "Session Count",
            "unit": "count",
            "raw_data": [...]
        }
    """
    try:
        data = generate_linechart_data(
            db_connection=db,
            x_axis=x_axis,
            y_axis=y_axis,
        )
        return VisualizationDataResponse(**data)
    except ValueError as e:
        # Validation errors (invalid x_axis, y_axis, etc.)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[Visualizations Router] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/heatmap")
async def generate_heatmap(
    x_axis: str = Query(..., description="X-axis dimension (e.g., 'rat_strain', 'apparatus', 'drug_compound')"),
    y_axis: str = Query(..., description="Y-axis dimension (e.g., 'tester', 'brain_region', 'session_type') - must be different from x_axis"),
    metric: str = Query(..., description="Cell value metric (e.g., 'session_count', 'avg_body_weight', 'unique_rats', 'avg_injection_count')"),
    db=Depends(get_db),
):
    """
    Generate data for a heatmap visualization showing 2D categorical patterns.
    
    Args:
        x_axis: First categorical dimension for X-axis (e.g., 'rat_strain', 'apparatus', 'tester', 'drug_compound', 'brain_region', 'session_type', 'lighting_condition', 'rat_sex', 'manipulation_type')
        y_axis: Second categorical dimension for Y-axis (must be different from x_axis)
        metric: Cell value metric to aggregate (e.g., 'session_count', 'unique_rats', 'avg_body_weight', 'avg_injection_count')
        
    Returns:
        JSON response with heatmap data structure:
        {
            "title": "Descriptive title",
            "xlabel": "X axis label",
            "ylabel": "Y axis label",
            "metric": "metric_id",
            "unit": "unit_name",
            "data": [
                {"x": "category1", "y": "categoryA", "value": 45},
                {"x": "category1", "y": "categoryB", "value": 12},
                ...
            ],
            "x_categories": ["category1", "category2", ...],
            "y_categories": ["categoryA", "categoryB", ...],
            "min_value": 0,
            "max_value": 52,
            "raw_data": [...]
        }
        
    Supported X/Y-axis options:
        - rat_strain: Group by rat strain
        - rat_sex: Group by rat sex (male/female)
        - session_type: Group by session type (training, testing, etc.)
        - apparatus: Group by apparatus/equipment
        - lighting_condition: Group by lighting (on/off)
        - tester: Group by experimenter name
        - drug_compound: Group by pharmaceutical compound
        - brain_region: Group by brain region of surgery
        - manipulation_type: Group by manipulation type (lesion, implant, etc.)
        
    Supported metrics:
        - session_count: Number of sessions
        - unique_rats: Number of unique rats
        - avg_body_weight: Average body weight (grams)
        - avg_injection_count: Average injection count
        
    Examples:
        GET /visualizations/heatmap?x_axis=drug_compound&y_axis=brain_region&metric=session_count
        → Sessions per drug-brain region combination
        
        GET /visualizations/heatmap?x_axis=apparatus&y_axis=rat_strain&metric=avg_body_weight
        → Average weight by apparatus and strain
        
        GET /visualizations/heatmap?x_axis=tester&y_axis=session_type&metric=session_count
        → Tester workload by session type
    """
    try:
        # Validate that X and Y are different
        if x_axis == y_axis:
            raise ValueError("X-axis and Y-axis must be different dimensions")
        
        data = generate_heatmap_data(
            db_connection=db,
            x_axis=x_axis,
            y_axis=y_axis,
            metric=metric,
        )
        return data
    except ValueError as e:
        # Validation errors (invalid x_axis, y_axis, metric, or same dimensions)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[Visualizations Router] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
