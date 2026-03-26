"""
Filter Service - Business logic for applying structured filters to queries.
Clean rewrite of the original filters.py with bug fixes and security improvements.
"""

from __future__ import annotations

import re
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

# Base query that joins all relevant tables.
#
# We also join session summary-measure tables and expose them as first-class columns
# so they can be filtered like other attributes and appear in returned results.
BASE_QUERY = """
SELECT
  E1.*,
  R1.*,
  B1.*,
  T1.*,
  A1.*,
  AP1.*,
  TR1.*,
  SDD1.*,
  SDF1.*,
  SML1.measure_value AS distance_travelled,
  SMC1.measure_value AS total_checking,
  SMC2.measure_value AS length_of_check
FROM experimental_sessions AS E1
LEFT OUTER JOIN rats AS R1 ON R1.rat_id = E1.rat_id
LEFT OUTER JOIN brain_manipulations AS B1 ON B1.rat_id = E1.rat_id
LEFT OUTER JOIN testers AS T1 ON T1.tester_id = E1.tester_id
LEFT OUTER JOIN apparatuses AS A1 ON A1.apparatus_id = E1.apparatus_id
LEFT OUTER JOIN apparatus_patterns AS AP1 ON AP1.pattern_id = E1.pattern_id
LEFT OUTER JOIN testing_rooms AS TR1 ON TR1.room_id = E1.room_id
LEFT OUTER JOIN session_drug_details AS SDD1 ON SDD1.session_id = E1.session_id
LEFT OUTER JOIN session_data_files AS SDF1 ON SDF1.session_id = E1.session_id
LEFT OUTER JOIN session_sm_locomotion AS SML1
  ON SML1.session_id = E1.session_id
  AND SML1.component_measure = 'Amount of locomotion'
  AND SML1.measure_variable = 'Total distance (m)'
LEFT OUTER JOIN session_sm_checking AS SMC1
  ON SMC1.session_id = E1.session_id
  AND SMC1.component_measure = 'Frequency of checking'
  AND SMC1.measure_variable = 'Returns to key locale (#)'
LEFT OUTER JOIN session_sm_checking AS SMC2
  ON SMC2.session_id = E1.session_id
  AND SMC2.component_measure = 'Length of check'
  AND SMC2.measure_variable = 'Duration of visit to key locale (log s)'
"""


# Field mapping from frontend names to database columns
FIELD_MAPPINGS = {
    "id": "E1.session_id",
    "rat": "E1.rat_id",
    "tester": "E1.tester_id",
    "apparatus": "E1.apparatus_id",
    "room": "E1.room_id",
    # Session summary measures (exposed as selected columns in BASE_QUERY)
    "distance_travelled": "distance_travelled",
    "total_checking": "total_checking",
    "length_of_check": "length_of_check",
}

SUMMARY_MEASURE_CONFIG = {
    # Canonical keys for summary measures (server normalizes user input)
    "distance_travelled": {
        "table": "session_sm_locomotion",
        "component_measure": "Amount of locomotion",
        "measure_variable": "Total distance (m)",
    },
    "total_checking": {
        "table": "session_sm_checking",
        "component_measure": "Frequency of checking",
        "measure_variable": "Returns to key locale (#)",
    },
    "length_of_check": {
        "table": "session_sm_checking",
        "component_measure": "Length of check",
        "measure_variable": "Duration of visit to key locale (log s)",
    },
}

def _canonicalize_summary_measure_field(field: str) -> str:
    """
    Normalize user-provided summary measure names into our canonical keys.
    Examples:
      - "Distance Travelled" -> "distance_travelled"
      - "distance_travelled" -> "distance_travelled"
      - "distancetravelled" -> "distance_travelled"
    """
    f = field.strip().lower()
    # Turn spaces/underscores into underscores, then remove leftover underscores
    # so we can match "distancetravelled" too.
    if f in SUMMARY_MEASURE_CONFIG:
        return f

    # Canonical forms: "distance_travelled", "total_checking", "length_of_check"
    # If the user removes separators entirely, we still map it by removing underscores/spaces.
    compact = re.sub(r"[_\s]+", "", f)
    if compact == "distancetravelled":
        return "distance_travelled"
    if compact == "totalchecking":
        return "total_checking"
    if compact == "lengthofcheck":
        return "length_of_check"
    return compact  # allow caller to fail unknown fields


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
        field_key = f.field.strip()

        # Normalize summary-measure display names to canonical keys, then map like any other field.
        canonical_summary_field = _canonicalize_summary_measure_field(field_key)
        mapped = FIELD_MAPPINGS.get(canonical_summary_field)
        if mapped is None:
            mapped = FIELD_MAPPINGS.get(field_key) or FIELD_MAPPINGS.get(field_key.lower())

        if mapped is not None:
            field_name = mapped
        else:
            # Validate raw field names to reduce injection risk
            if not field_key.isidentifier():
                raise ValueError(f"Invalid field identifier: {f.field}")
            field_name = f"E1.{field_key}"

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
