"""
Files Router - Endpoints for file download action.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from core.database import get_db
from services.nlp_service import execute_nlp_query
from services.download_service import NLP_FileDownload, FILTERS_FileDownload
import zipfile
from io import BytesIO
import os

router = APIRouter(prefix="/files", tags=["Files"])


@router.get("/")
async def download_action(
    query_type: str,
    Csv_Flag: str,
    Ewb_Flag: str,
    Jpg_Flag: str,
    Mpg_Flag: str,
    Gif_Flag: str,
    db=Depends(get_db)
):
    """
    Get Most recently executed query and download session files
    """
    try:
        print(query_type)

        if query_type == "NLP":
        
            result = NLP_FileDownload(db,[["csv",Csv_Flag],["ewb",Ewb_Flag],["jpg",Jpg_Flag],["mpg",Mpg_Flag],["gif",Gif_Flag]])
        
        elif query_type == "FILTER":
            result = FILTERS_FileDownload(db,[["csv",Csv_Flag],["ewb",Ewb_Flag],["jpg",Jpg_Flag],["mpg",Mpg_Flag],["gif",Gif_Flag]])

        dir_path = "../FRDR_Files"

        zipped_dir = zip_directory_stream(dir_path)

        return StreamingResponse(
            zipped_dir,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=FRDR_Files.zip"}
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
    