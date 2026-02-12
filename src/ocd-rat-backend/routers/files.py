"""
Files Router - Endpoints for file download action.
"""

from fastapi import APIRouter, Depends, HTTPException,BackgroundTasks
from fastapi.responses import StreamingResponse
from core.database import get_db
from services.nlp_service import execute_nlp_query
from services.download_service import NLP_FileDownload, FILTERS_FileDownload
import zipfile
from io import BytesIO
import os
import json

router = APIRouter(prefix="/files", tags=["Files"])


@router.get("/")
async def download_action(
    query_type: str,
    Csv_Flag: str,
    Ewb_Flag: str,
    Jpg_Flag: str,
    Mpg_Flag: str,
    Gif_Flag: str,
    background_tasks: BackgroundTasks,
    job_id: str,
    db=Depends(get_db)

):
    status_json = {job_id: {"status":"not started",
                   "num_files": 0,
                   "completed": 0}}
    
    with open("status_buffer.json", "w") as f:
        json.dump(status_json,f)

    background_tasks.add_task(download_helper, query_type,Csv_Flag,Ewb_Flag,Jpg_Flag,Mpg_Flag,Gif_Flag,job_id,db)
    return {"downloading":"true"}

def download_helper(query_type: str,
    Csv_Flag: str,
    Ewb_Flag: str,
    Jpg_Flag: str,
    Mpg_Flag: str,
    Gif_Flag: str,
    job_id: str,
    db):
    try:
        print(query_type)

        if query_type == "NLP":
        
            result = NLP_FileDownload(db,[["csv",Csv_Flag],["ewb",Ewb_Flag],["jpg",Jpg_Flag],["mpg",Mpg_Flag],["gif",Gif_Flag]],job_id)
        
        elif query_type == "FILTER":
            result = FILTERS_FileDownload(db,[["csv",Csv_Flag],["ewb",Ewb_Flag],["jpg",Jpg_Flag],["mpg",Mpg_Flag],["gif",Gif_Flag]],job_id)

        dir_path = "../FRDR_Files_" + job_id
        file_name = "FRDR_Files_" + job_id + ".zip"
        zipped_dir = zip_directory_stream(dir_path)

        return StreamingResponse(
            zipped_dir,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={file_name}"}
        )
    except Exception as e:
        print(f"[FILES Router] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def zip_directory_stream(dir_path: str):
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(dir_path):
            for file in files:
                full_path = os.path.join(root, file)
                arcname = os.path.relpath(full_path, dir_path)
                zipf.write(full_path, arcname)
    buffer.seek(0)
    return buffer


@router.get("/status/")
async def get_status(job_id: str):

    with open("status_buffer.json", "r") as f:
        content = json.load(f)
        status = content.get(job_id)
    
    

    return status

@router.get("/serve/")
def serve_files(job_id: str):
    try:
        dir_path = "../FRDR_Files"
        file_name = "FRDR_Files_" + job_id + ".zip"

        zipped_dir = zip_directory_stream(dir_path)

        return StreamingResponse(
            zipped_dir,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={file_name}"}
        )
    except Exception as e:
        print(f"[FILES Router] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    