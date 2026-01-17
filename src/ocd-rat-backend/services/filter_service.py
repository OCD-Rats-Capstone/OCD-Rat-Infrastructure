"""
Filter Service - Business logic for applying structured filters to queries.
Clean rewrite of the original filters.py with bug fixes and security improvements.
"""

import pandas as pd
import numpy as np
from typing import List
from schemas.query import FilterItem


# Operator mapping from API names to SQL operators
OPERATORS = {
    "equal": "=",
    "gte": ">=",
    "lte": "<=",
    "gt": ">",
    "lt": "<",
}

# Base query that joins all relevant tables
# This matches the original query structure for backward compatibility
BASE_QUERY = """
SELECT * FROM experimental_sessions AS E1
LEFT OUTER JOIN rats AS R1 ON R1.rat_id = E1.rat_id
LEFT OUTER JOIN brain_manipulations AS B1 ON B1.rat_id = E1.rat_id
LEFT OUTER JOIN testers AS T1 ON T1.tester_id = E1.tester_id
LEFT OUTER JOIN apparatuses AS A1 ON A1.apparatus_id = E1.apparatus_id
LEFT OUTER JOIN apparatus_patterns AS AP1 ON AP1.pattern_id = E1.pattern_id
LEFT OUTER JOIN testing_rooms AS TR1 ON TR1.room_id = E1.room_id
LEFT OUTER JOIN session_drug_details AS SDD1 ON SDD1.session_id = E1.session_id
LEFT OUTER JOIN session_data_files AS SDF1 ON SDF1.session_id = E1.session_id
"""


# Field mapping from frontend names to database columns
FIELD_MAPPINGS = {
    "id": "E1.session_id",
    "rat": "E1.rat_id",
    "tester": "E1.tester_id",
    "apparatus": "E1.apparatus_id",
    "room": "E1.room_id",
}


def _build_where_clause(filters: List[FilterItem]) -> tuple[str, list]:
    """
    Build a parameterized WHERE clause from filter items.
    
    Returns:
        A tuple of (where_clause_string, parameter_values)
    """
    if not filters:
        return "", []
    
    conditions = []
    params = []
    
    for f in filters:
        # Resolve field name using mapping or default to E1 alias
        field_name = FIELD_MAPPINGS.get(f.field, f"E1.{f.field}")
        
        if f.operator == "range":
            # Range format is "low$high"
            parts = f.value.split("$")
            if len(parts) != 2:
                raise ValueError(f"Range value must be in 'low$high' format, got: {f.value}")
            
            low, high = parts
            conditions.append(f"{field_name} >= %s AND {field_name} <= %s")
            params.extend([low, high])
        else:
            sql_op = OPERATORS.get(f.operator)
            if not sql_op:
                raise ValueError(f"Unknown operator: {f.operator}")
            
            conditions.append(f"{field_name} {sql_op} %s")
            params.append(f.value)
    
    where_clause = " WHERE " + " AND ".join(conditions)
    return where_clause, params


def execute_filter_query(filters: List[FilterItem], db_connection) -> pd.DataFrame:
    """
    Apply filters and execute the query against the database.
    
    Args:
        filters: List of FilterItem objects defining the filters to apply
        db_connection: An active psycopg2 database connection
        
    Returns:
        A pandas DataFrame with the filtered results
        
    Raises:
        ValueError: If filter validation fails
        Exception: If query execution fails
    """
    where_clause, params = _build_where_clause(filters)
    
    full_query = BASE_QUERY + where_clause
    
    print(f"[Filter Service] Executing query with {len(filters)} filter(s)")
    print(f"[Filter Service] Query: {full_query}")
    print(f"[Filter Service] Params: {params}")
    
    pd.set_option('display.max_columns', None)
    
    # Use parameterized query to prevent SQL injection
    df = pd.read_sql_query(full_query, db_connection, params=params)
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.fillna("None")
    
    print(f"[Filter Service] Result: {len(df)} rows")
    
    return df
