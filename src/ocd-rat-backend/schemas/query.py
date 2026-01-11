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
        if not v.replace("_", "").isalnum():
            raise ValueError("Field name must be alphanumeric (underscores allowed)")
        return v


class FilterRequest(BaseModel):
    """Request body for the /filters endpoint."""
    filters: list[FilterItem]
