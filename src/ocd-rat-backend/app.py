
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
#import test as test
import visualization

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root(query_type: str = "NLP", text: str = "select all records where the rat id is equal to 8"):

    df = test.main(query_type,text)
    jsonified = df.to_dict(orient='records')
    return jsonified

# ===== Visualization Endpoints =====

@app.get("/api/brain-lesion-data")
async def get_brain_lesion_data():
    """
    Get brain lesion data grouped by drug for visualization.
    Returns left and right hemisphere damage data for each drug treatment.
    """
    try:
        result = visualization.get_brain_lesion_data()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch brain lesion data: {str(e)}"
        )

@app.get("/api/test-connection")
async def test_connection():
    """
    Test database connection and return status.
    Useful for debugging connection issues.
    """
    result = visualization.test_connection()
    if result['status'] == 'Failed':
        raise HTTPException(status_code=500, detail=result)
    return result

@app.get("/api/stats")
async def get_stats():
    """
    Get summary statistics about the database.
    Returns counts of drugs, rats, sessions, etc.
    """
    try:
        result = visualization.get_database_stats()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch statistics: {str(e)}"
        )

@app.get("/api/validate-data")
async def validate_data():
    """
    Validate that database has required data for visualizations.
    Checks data completeness and relationships.
    """
    try:
        result = visualization.validate_data()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to validate data: {str(e)}"
        )

@app.get("/api/drugs")
async def get_drugs():
    """
    Get list of all drugs in the database.
    """
    try:
        result = visualization.get_drugs_list()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch drugs: {str(e)}"
        )

@app.get("/api/brain-regions")
async def get_brain_regions():
    """
    Get list of all brain regions in the database.
    """
    try:
        result = visualization.get_brain_regions_list()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch brain regions: {str(e)}"
        )

# Run with: fastapi dev app.py

# ===== Health Check =====
@app.get("/health")
async def health_check():
    """
    Simple health check endpoint.
    """
    return {
        "status": "healthy",
        "message": "Szechtman Lab API is running"
    }
