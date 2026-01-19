"""
NLP Router - Endpoints for natural language query processing.
"""

from fastapi import APIRouter, Depends, HTTPException
from core.database import get_db
from services.nlp_service import execute_nlp_query


router = APIRouter(prefix="/nlp", tags=["NLP"])


@router.get("/")
async def nlp_query(
    text: str = "select all records where the rat id is equal to 8",
    db=Depends(get_db)
):
    """
    Process a natural language query and return matching records.
    
    Args:
        text: Natural language description of the desired query
        
    Returns:
        JSON object with 'rationale', 'sql', and 'results' keys
    """
    try:
        result = execute_nlp_query(text, db)
        return result
    except Exception as e:
        print(f"[NLP Router] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

