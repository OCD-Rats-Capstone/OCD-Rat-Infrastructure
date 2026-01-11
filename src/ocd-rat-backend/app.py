"""
OCD Rat Backend - FastAPI Application Entry Point

This is the main application file that configures and starts the FastAPI server.
Route handlers are organized in the routers/ directory.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import nlp, filters, ask

# Create FastAPI application
app = FastAPI(
    title="OCD Rat Backend",
    description="API for querying OCD rat experimental data",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(nlp.router)
app.include_router(filters.router)
app.include_router(ask.router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "OCD Rat Backend is running"}