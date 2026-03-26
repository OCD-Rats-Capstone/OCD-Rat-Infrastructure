"""
Inventory Router - Endpoints for inventory counts by data type and filter options.
"""

from fastapi import APIRouter, Depends, HTTPException

from core.database import get_db
from schemas.query import InventoryCountsRequest, InventoryCountsResponse
from services.inventory_service import get_inventory_counts, get_inventory_sessions
from services.inventory_filter_options import get_filter_options

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.post("/counts", response_model=InventoryCountsResponse)
async def inventory_counts(request: InventoryCountsRequest, db=Depends(get_db)):
    """
    Return counts by raw data object type for sessions matching the filter set.
    All filters are ANDed. drug_ids = regimens that contain ALL listed drugs (combination).
    """
    try:
        return get_inventory_counts(request, db)
    except Exception as e:
        print(f"[Inventory Router] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions")
async def list_sessions(request: InventoryCountsRequest, db=Depends(get_db)):
    """
    Return session list (session_id, legacy_session_id, session_timestamp, rat_id, etc.)
    for sessions matching the same filter set as /counts. Capped at 500 for performance.
    """
    try:
        sessions = get_inventory_sessions(request, db)
        return sessions
    except Exception as e:
        print(f"[Inventory Router] sessions Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/filter-options")
async def filter_options(db=Depends(get_db)):
    """
    Return filter dimensions with labels: drugs, apparatuses, apparatus_patterns,
    session_types, surgery_types, brain_regions, testing_rooms.
    """
    try:
        return get_filter_options(db)
    except Exception as e:
        print(f"[Inventory Router] filter-options Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
