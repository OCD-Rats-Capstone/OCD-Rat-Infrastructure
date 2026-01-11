"""
Filters Router - Endpoints for structured filter queries.
"""

from fastapi import APIRouter, Depends, HTTPException
from core.database import get_db
from schemas.query import FilterRequest
from services.filter_service import execute_filter_query


router = APIRouter(tags=["Filters"])


@router.post("/filters/")
async def apply_filters(request: FilterRequest, db=Depends(get_db)):
    """
    Apply structured filters to the experimental sessions data.
    
    Args:
        request: FilterRequest containing a list of filter conditions
        
    Returns:
        List of matching records as JSON objects
    """
    try:
        df = execute_filter_query(request.filters, db)
        return df.to_dict(orient='records')
    except ValueError as e:
        # Validation errors from the filter service
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[Filters Router] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
