

"""
Centralized database connection management.
Provides a dependency injection pattern for FastAPI routes.
"""

import psycopg2
from typing import Generator

import pandas as pd
import numpy as np
import json
from pathlib import Path

json_population_queries = [["apparatus_name","Apparatus","SELECT distinct apparatus_name FROM apparatuses ORDER BY apparatus_name;"],
                           ["drug_name","Drug Administered","SELECT distinct drug_name FROM drugs ORDER BY drug_name;"],
                           ["surgery_type","Surgery Type","SELECT distinct surgery_type FROM brain_manipulations ORDER BY surgery_type;"]]
results_list = []
conn = None
try:
    conn = psycopg2.connect(
        host="localhost",
        database="postgres",
        user="postgres",
        password="Gouda",
        port="5432"
    )

    json_result = {}
    for q in json_population_queries:
        pd.set_option('display.max_columns', None)
        # Use parameterized query to prevent SQL injection
        df = pd.read_sql_query(q[2], conn)
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.fillna("None")
        result = df[q[0]].to_list()
        json_result[q[1]] = result
    print(json_result)
    file_path = Path(__file__).parent.parent.parent / "ocd-rat-frontend/src/data/Inventory.json"
    with open(file_path,"w") as file:
        json.dump(json_result,file,indent=4)
except Exception as e:

    print(f"Database Could not Connect: ({e})")
finally:
    if conn:
            conn.close()
