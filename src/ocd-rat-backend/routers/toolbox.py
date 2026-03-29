"""
Files Router - Endpoints for file download action.
"""

from fastapi import APIRouter, Depends, HTTPException,BackgroundTasks
from fastapi.responses import StreamingResponse
from core.database import get_db
from services.nlp_service import execute_nlp_query
from services.summary_service import (
    get_relevant_sessions,
    execute_graph_query,
    list_graph_queries,
)
from services.download_service import NLP_FileDownload, FILTERS_FileDownload, single_smoothed_download, generate_distance, generate_velocity_profile
import zipfile
from io import BytesIO
import os
import json
import shutil

router = APIRouter(prefix="/toolbox", tags=["Files"])


@router.get("/velocity-profile/")
async def get_velocity_profile(
    session_id: str,
    location_x: float,
    location_y: float,
    radius: float,
    max_frames: int = 150,
    min_trip_frames: int = 5,
    db=Depends(get_db),
):
    """
    Compute velocity profiles for move segments entering/exiting a user-defined zone.

    Args:
        session_id: Session ID to analyse.
        location_x: X coordinate of the zone centre (same coordinate system as the tracking data).
        location_y: Y coordinate of the zone centre.
        radius: Zone radius in tracking-data coordinate units.
        max_frames: Maximum frames included per segment side (default 150).
        min_trip_frames: Minimum trip length to keep; shorter trips are treated as lingering
            and excluded (default 5).

    Returns:
        exiting_segments: List of segments where frame 0 is the zone exit.
        entering_segments: List of segments where frame 0 is the zone entry (negative frames
            preceding it).
        total_trips: Total number of qualifying trips found.
        session_frames: Total number of frames in the session trajectory.
    """
    result = generate_velocity_profile(
        db_connection=db,
        session_id=session_id,
        location_x=location_x,
        location_y=location_y,
        radius=radius,
        max_frames=max_frames,
        min_trip_frames=min_trip_frames,
    )
    return result

@router.get("/session/")
async def load_session(
    session_id: str,
    db=Depends(get_db)

):

    return single_smoothed_download(db,session_id,session_id)

@router.get("/dropdown/")
async def get_session(
    input: str,
    db=Depends(get_db)

):

    res = get_relevant_sessions(db,input)

    return ({"data": res})

@router.get("/graph-queries/")
async def get_graph_queries():
    """List graph query slots and implementation status for all 5 panels."""
    return {"queries": list_graph_queries()}


@router.get("/graph-query/{query_id}/")
async def run_graph_query(query_id: int, db=Depends(get_db)):
    """Execute one of the graph SQL queries by id (1..5)."""
    try:
        return execute_graph_query(db, query_id)
    except (ValueError, NotImplementedError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[Toolbox Router] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/distance/")
async def get_session(
    input: str,
    legacySession: str,
    dataTrial: str,
    db=Depends(get_db)

):

    res = generate_distance(db,input,input,legacySession,dataTrial)

    return ({"total_distance": res})



