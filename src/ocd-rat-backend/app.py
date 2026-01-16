from pydantic import BaseModel
import test as test
import filters as filters_module
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import visualization

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FilterItem(BaseModel):
    id: str
    field: str
    operator: str
    value: str

class FilterRequest(BaseModel):
    filters: list[FilterItem]
    CsvChecked: bool | None = None

@app.get("/")
async def root(query_type: str = "NLP", text: str = "select all records where the rat id is equal to 8"):
    try:
     df = test.main(query_type,text)
     jsonified = df.to_dict(orient='records')
     return jsonified
    except Exception as e:
        return {"error": str(e)}

#  Visualization

@app.get("/api/brain-lesion-data")
async def get_brain_lesion_data():

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

    result = visualization.test_connection()
    if result['status'] == 'Failed':
        raise HTTPException(status_code=500, detail=result)
    return result

@app.get("/api/stats")
async def get_stats():

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
    try:
        result = visualization.get_brain_regions_list()
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch brain regions: {str(e)}"
        )

# Run with: fastapi dev app.py

#  Health Check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "Szechtman Lab API is running"
    }
@app.post("/filters")
async def apply_filters(request: FilterRequest):
    """Apply filters to the dataset using the filters module"""
    try:
        
        df = filters_module.main(request.filters,request.CsvChecked)
        jsonified = df.to_dict(orient='records')
        return jsonified
    except Exception as e:
        return {"error": str(e)}
