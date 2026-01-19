"""
NLP Query Service - Business logic for natural language SQL generation.
Extracted from the original test.py file.
"""

import pandas as pd
import numpy as np
from llm.llm_service import llm_service


def execute_nlp_query(query_string: str, db_connection) -> dict:
    """
    Generate SQL from natural language and execute it against the database.
    
    Args:
        query_string: The natural language query from the user
        db_connection: An active psycopg2 database connection
        
    Returns:
        A dict with 'rationale', 'sql', and 'results' keys
        
    Raises:
        Exception: If SQL generation or execution fails
    """
    print("--- OCD Rat NLP Query ---")
    print(f"Goal: {query_string}")
    
    # 1. Generate SQL with rationale using LLM Service
    print("\n[LLM] Generating SQL with rationale...")
    plan_result = llm_service.plan_and_generate_sql(query_string)
    rationale = plan_result["rationale"]
    sql_query = plan_result["sql"]
    print(f"[LLM] Rationale: {rationale}")
    print(f"[LLM] Generated Query:\n{sql_query}\n")

    # 2. Execute Query
    print("[DB] Executing Query...")
    
    pd.set_option('display.max_columns', None)
    pd.set_option('display.expand_frame_repr', False)

    df = pd.read_sql_query(sql_query, db_connection)
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.fillna("None")

    print(f"\n[DB] Result ({len(df)} rows):")
    print(df.head(10))
    
    return {
        "rationale": rationale,
        "sql": sql_query,
        "results": df.to_dict(orient='records')
    }

