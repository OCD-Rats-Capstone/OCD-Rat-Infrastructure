"""
Ask Router - Endpoint for general conversational LLM queries.
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from schemas.query import AskRequest
from llm.llm_service import llm_service
import logging


logger = logging.getLogger(__name__)
router = APIRouter(tags=["Ask"])


@router.post("/ask/")
async def ask_question(request: AskRequest):
    """
    Ask a general question about the research project, dataset, or tool usage.
    Returns streaming Server-Sent Events (SSE) for real-time token delivery.
    
    Args:
        request: AskRequest containing the user's question
        
    Returns:
        StreamingResponse with SSE format (data: <token>\\n\\n)
    """
    def event_generator():
        """Generator that yields SSE-formatted tokens."""
        try:
            for token in llm_service.ask_question(request.question):
                # SSE format: data: <content>\n\n
                yield f"data: {token}\n\n"
            # Signal completion
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.exception("Error while processing ask_question request")
            # Return a generic error message to the client without exposing internals
            yield "data: Error: An internal error occurred.\n\n"
            yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )
