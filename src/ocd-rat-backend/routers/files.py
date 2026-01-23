"""
Files Router - Endpoints for file download action.
"""

from fastapi import APIRouter, Depends, HTTPException
from core.database import get_db
from services.nlp_service import execute_nlp_query
from services.download_service import NLP_FileDownload


router = APIRouter(prefix="/files", tags=["Files"])


@router.get("/")
async def download_action(
    query_type: str,
    C: str,
    M: str,
    G: str,
    db=Depends(get_db)
):
    """
    Get Most recently executed query and download session files
    """
    try:
        result = NLP_FileDownload(db,[["csv",C],["mpg",M],["gif",G]])
        return result
    except Exception as e:
        print(f"[NLP Router] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))