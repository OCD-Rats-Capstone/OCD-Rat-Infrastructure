"""
Pydantic models for query-related requests and responses.
"""

from pydantic import BaseModel, field_validator
from typing import Literal


# Valid operators for filter queries
VALID_OPERATORS = {"equal", "gte", "lte", "gt", "lt", "range"}


class FilterItem(BaseModel):
    """
    A single filter condition to apply to the query.
    
    Attributes:
        id: Unique identifier for this filter (for frontend tracking)
        field: The database column to filter on (e.g., "rat_id", "session_id")
        operator: The comparison operator to use
        value: The value to compare against. For "range" operator, use "low$high" format.
    """
    id: str
    field: str
    operator: Literal["equal", "gte", "lte", "gt", "lt", "range"]
    value: str

    @field_validator("field")
    @classmethod
    def validate_field(cls, v: str) -> str:
        """Ensure field name doesn't contain SQL injection characters."""
        clean = v.strip()
        if not clean:
            raise ValueError("Field name cannot be empty")

        # We only allow characters that are safe to use as an identifier once we map/normalize
        # server-side (e.g. session summary measures may include spaces like "Distance Travelled").
        for ch in clean:
            if not (ch.isalnum() or ch in {"_", " "}):
                raise ValueError("Field name may only contain letters, digits, spaces, and underscores")

        return clean


class FilterRequest(BaseModel):
    """Request body for the /filters endpoint."""
    filters: list[FilterItem]


class AskRequest(BaseModel):
    """Request body for the /ask endpoint."""
    question: str


# --- Inventory API ---


class InventoryCountsRequest(BaseModel):
    """
    Filter set for inventory counts. All provided filters are ANDed.
    drug_ids: regimens that contain ALL of these drugs (combination).
    """
    drug_ids: list[int] | None = None
    file_type_ids: list[int] | None = None
    rx_ids: list[int] | None = None
    apparatus_id: int | None = None
    pattern_id: int | None = None
    session_type_id: int | None = None
    effective_manipulation_id: int | None = None
    surgery_type: str | None = None  # e.g. Lesion, Sham, Unoperated
    target_region_id: int | None = None
    room_id: int | None = None

    # --- Session summary measures (optional numeric filters) ---
    # These correspond to measure_value in session_sm_* tables.
    distance_travelled_min: float | None = None
    distance_travelled_max: float | None = None
    total_checking_min: float | None = None
    total_checking_max: float | None = None
    length_of_check_min: float | None = None
    length_of_check_max: float | None = None


class DataTypeCount(BaseModel):
    """Count of raw data objects for one type."""
    object_type_id: int
    object_type_name: str
    file_count: int
    session_count: int


class InventoryCountsResponse(BaseModel):
    """Counts by data type for sessions matching the filters."""
    total_sessions: int
    counts_by_type: list[DataTypeCount]


# Optional: session list for drill-down (same filter set as counts)
INVENTORY_SESSIONS_LIMIT = 500
