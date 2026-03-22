"""
Files Router - Endpoints for file download action.
"""

from fastapi import APIRouter, Depends, HTTPException,BackgroundTasks
from fastapi.responses import StreamingResponse
from core.database import get_db
from services.nlp_service import execute_nlp_query
from services.download_service import NLP_FileDownload, FILTERS_FileDownload, single_smoothed_download
from services.summary_service import get_relevant_sessions
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



