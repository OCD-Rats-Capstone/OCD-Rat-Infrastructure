

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

json_population_queries = [["apparatus_name","Apparatus","SELECT count(apparatus_name), apparatus_name FROM experimental_sessions AS E LEFT OUTER JOIN apparatuses AS A ON E.apparatus_id = A.apparatus_id GROUP BY apparatus_name ORDER BY apparatus_name;"],
                           ["drug_name","Drug Administered",
                            "SELECT count(D.drug_name), D.drug_name FROM experimental_sessions as E "
                            "LEFT OUTER JOIN drug_rx_details AS R ON E.drug_rx_id = R.drug_rx_id "
                            "LEFT OUTER JOIN drugs as D ON R.drug_id = D.drug_id "
                            "GROUP BY (d.drug_name) ORDER BY D.drug_name;"],
                           ["surgery_type","Surgery Type","SELECT count(surgery_type), surgery_type FROM experimental_sessions AS E LEFT OUTER JOIN brain_manipulations AS B ON E.rat_id = B.rat_id GROUP BY surgery_type ORDER BY surgery_type;"],
                           ["pattern_description","Apparatus Pattern","SELECT count(pattern_description), pattern_description FROM experimental_sessions AS E LEFT OUTER JOIN apparatus_patterns AS A ON A.pattern_id = E.pattern_id GROUP BY pattern_description ORDER BY pattern_description;"],
                           ["type_name","Session Type","SELECT count(type_name), type_name FROM experimental_sessions AS E LEFT OUTER JOIN session_types AS A ON A.session_type_id = E.session_type_id GROUP BY type_name ORDER BY type_name;"]]
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
        count = df["count"].to_list()

        for r in range (len(result)):
             result[r] = result[r] + " ("+str(count[r])+")"

        json_result[q[1]] = result
    file_path = Path(__file__).parent.parent.parent / "ocd-rat-frontend/src/data/Inventory.json"
    with open(file_path,"w") as file:
        json.dump(json_result,file,indent=4)
except Exception as e:

    print(f"Database Could not Connect: ({e})")
finally:
    if conn:
            conn.close()
