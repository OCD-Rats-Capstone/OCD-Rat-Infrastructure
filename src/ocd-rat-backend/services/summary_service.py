import pandas as pd
import numpy as np
import os
from urllib.request import urlretrieve
from services.nlp_service import execute_nlp_query
from services.graph_query_definitions import GRAPH_QUERY_DEFINITIONS
import shutil
import json
import base64
import math


measures = { 
    "Distance Travelled": {"component_measure": "Amount of locomotion","measure_variable": "Total distance (m)" },
    "Total Checking": {"component_measure": "Frequency of checking","measure_variable": "Returns to key locale (#)"},
    "Length of Check": {"component_measure": "Length of check","measure_variable": "Duration of visit to key locale (log s)"}
}

def get_relevant_sessions(db_connection, input):
    query = f"SELECT session_id FROM experimental_sessions WHERE session_id::text LIKE '{input}%';"

    df = pd.read_sql_query(query,db_connection)

    print(df)

    df_list = df["session_id"].head(100).to_list()

    print(df_list)

    return df_list

def total_distance_for_session(db_connection,session_id,measure="Distance Travelled"):
    
    query = f"SELECT measure_value FROM session_sm_locomotion WHERE session_id = {session_id}\
    AND component_measure = '{measures[measure]['component_measure']}' AND measure_variable = '{measures[measure]['measure_variable']}';"

    
    df = pd.read_sql_query(query, db_connection)

    if (df.empty):
        attribute = "N/A"
    else:
        attribute = df.squeeze()


    return attribute

def total_checks_for_session(db_connection,session_id,measure="Total Checking"):
    
    query = f"SELECT measure_value FROM session_sm_checking WHERE session_id = {session_id}\
    AND component_measure = '{measures[measure]['component_measure']}' AND measure_variable = '{measures[measure]['measure_variable']}';"

    df = pd.read_sql_query(query, db_connection)
    
    if (df.empty):
        attribute = "N/A"
    else:
        attribute = df.squeeze()


    return attribute


def _validate_required_tables(db_connection, required_tables):
    if not required_tables:
        return

    required_df = pd.read_sql_query(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ANY(%s)
        """,
        db_connection,
        params=(required_tables,),
    )
    present_tables = set(required_df["table_name"].tolist())
    missing_tables = [t for t in required_tables if t not in present_tables]
    if missing_tables:
        raise ValueError("Missing required table(s): " + ", ".join(missing_tables))


def _has_q21_tables(db_connection):
    table_check_sql = """
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'session_experiment_membership'
    ) AS has_sem,
    EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'experiment_groups'
    ) AS has_groups
    """

    table_flags = pd.read_sql_query(table_check_sql, db_connection).iloc[0]
    return bool(table_flags["has_sem"]) and bool(table_flags["has_groups"])


def list_graph_queries():
    entries = []
    for query_id in sorted(GRAPH_QUERY_DEFINITIONS.keys()):
        definition = GRAPH_QUERY_DEFINITIONS[query_id]
        entries.append(
            {
                "query_id": query_id,
                "slug": definition["slug"],
                "title": definition["title"],
                "description": definition["description"],
                "implemented": definition["implemented"],
            }
        )
    return entries


def execute_graph_query(db_connection, query_id):
    definition = GRAPH_QUERY_DEFINITIONS.get(query_id)
    if not definition:
        raise ValueError(f"Unsupported graph query id: {query_id}. Valid ids are 1-5.")

    if not definition["implemented"]:
        raise NotImplementedError(
            f"Graph query {query_id} ({definition['title']}) is a placeholder and is not implemented yet."
        )

    _validate_required_tables(db_connection, definition["required_tables"])

    use_full_query = _has_q21_tables(db_connection)
    selected_sql = definition["sql"] if use_full_query else definition["fallback_sql"]
    df = pd.read_sql_query(selected_sql, db_connection)
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.fillna("None")

    return {
        "query_id": query_id,
        "slug": definition["slug"],
        "title": definition["title"],
        "description": definition["description"],
        "used_q21_exclusion": use_full_query,
        "data": df.to_dict(orient="records"),
    }
