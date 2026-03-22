import pandas as pd
import numpy as np
import os
from urllib.request import urlretrieve
from services.nlp_service import execute_nlp_query
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



