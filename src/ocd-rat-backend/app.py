from fastapi import FastAPI
import test as test

from fastapi.middleware.cors import CORSMiddleware

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