"""
Visualization Schemas - Request and response models for data visualization endpoints.
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class BarChartDataRequest(BaseModel):
    """Request model for generating barchart data."""
    x_axis: str  # e.g., "rat_strain", "tester", "apparatus"
    y_axis: str  # e.g., "session_count", "avg_body_weight"
    observation_code: Optional[str] = None  # For filtering behavioral metrics


class VisualizationDataResponse(BaseModel):
    """Response model for visualization data."""
    labels: List[str]           # X-axis labels (x_axis variable values)
    values: List[float]         # Y-axis values (aggregated metrics)
    title: str                  # Chart title
    xlabel: str                 # X-axis label
    ylabel: str                 # Y-axis label
    unit: str                   # Unit of measurement for Y-axis
    raw_data: List[Dict[str, Any]]  # Raw aggregated data


class XAxisOption(BaseModel):
    """Configuration for an X-axis grouping variable."""
    id: str
    label: str
    description: str


class YAxisOption(BaseModel):
    """Configuration for a Y-axis metric."""
    id: str
    label: str
    description: str
    unit: str


class ObservationCode(BaseModel):
    """Available observation code for filtering behavioral metrics."""
    code: str
    label: str
    description: Optional[str] = None


class AvailableVisualizationsResponse(BaseModel):
    """Response listing all available visualization configuration options."""
    x_axis_options: List[XAxisOption]
    y_axis_options: List[YAxisOption]
    linechart_x_axis_options: List[XAxisOption]
    linechart_y_axis_options: List[YAxisOption]
    observation_codes: Optional[List[ObservationCode]] = None
