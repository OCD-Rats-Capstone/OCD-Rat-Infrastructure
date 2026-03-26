"""
Files Router - Endpoints for file download action.
"""

from fastapi import APIRouter, Depends, HTTPException,BackgroundTasks
from fastapi.responses import StreamingResponse
from core.database import get_db
from services.nlp_service import execute_nlp_query
from services.download_service import NLP_FileDownload, FILTERS_FileDownload, single_smoothed_download
from services.summary_service import (
    get_relevant_sessions,
    execute_graph_query,
    list_graph_queries,
)
import zipfile
from io import BytesIO
import os
import json
import shutil

router = APIRouter(prefix="/toolbox", tags=["Files"])


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



