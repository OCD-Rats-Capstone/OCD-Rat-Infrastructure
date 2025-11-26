from fastapi import FastAPI
from pydantic import BaseModel
import test as test
import filters as filters_module

from fastapi.middleware.cors import CORSMiddleware

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

@app.post("/filters")
async def apply_filters(request: FilterRequest):
    """Apply filters to the dataset using the filters module"""
    try:
        
        df = filters_module.main(request.filters,request.CsvChecked)
        jsonified = df.to_dict(orient='records')
        return jsonified
    except Exception as e:
        return {"error": str(e)}