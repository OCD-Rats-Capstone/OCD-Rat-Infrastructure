"""
Inventory Filter Options - Return filter dimensions with labels (and optional counts) from DB.
"""

from __future__ import annotations

import pandas as pd


def get_filter_options(db_connection) -> dict:
    """
    Return current filter dimensions: drugs, apparatuses, patterns, session types,
    surgery types (brain), brain regions, testing rooms.
    Each list contains { id, label } (and optionally count).
    """
    out: dict = {}

    # Drugs: id, label (name or abbreviation)
    df_drugs = pd.read_sql_query(
        "SELECT drug_id AS id, COALESCE(drug_name, drug_abbreviation, '') AS label FROM drugs ORDER BY drug_id",
        db_connection,
    )
    out["drugs"] = df_drugs.to_dict(orient="records")

    # Apparatuses
    df_app = pd.read_sql_query(
        "SELECT apparatus_id AS id, COALESCE(apparatus_name, apparatus_code, '') AS label FROM apparatuses ORDER BY apparatus_id",
        db_connection,
    )
    out["apparatuses"] = df_app.to_dict(orient="records")

    # Apparatus patterns
    df_pat = pd.read_sql_query(
        "SELECT pattern_id AS id, COALESCE(pattern_description, '') AS label FROM apparatus_patterns ORDER BY pattern_id",
        db_connection,
    )
    out["apparatus_patterns"] = df_pat.to_dict(orient="records")

    # Session types
    df_st = pd.read_sql_query(
        "SELECT session_type_id AS id, COALESCE(type_name, '') AS label FROM session_types ORDER BY session_type_id",
        db_connection,
    )
    out["session_types"] = df_st.to_dict(orient="records")

    # Surgery type (distinct from brain_manipulations)
    df_surg = pd.read_sql_query(
        "SELECT DISTINCT surgery_type AS label FROM brain_manipulations WHERE surgery_type IS NOT NULL ORDER BY surgery_type",
        db_connection,
    )
    out["surgery_types"] = [{"label": str(row["label"])} for _, row in df_surg.iterrows()]

    # Brain regions
    df_reg = pd.read_sql_query(
        "SELECT region_id AS id, COALESCE(region_abbreviation, region_name, '') AS label FROM brain_regions ORDER BY region_id",
        db_connection,
    )
    out["brain_regions"] = df_reg.to_dict(orient="records")

    # Testing rooms
    df_room = pd.read_sql_query(
        "SELECT room_id AS id, COALESCE(room_name, '') AS label FROM testing_rooms ORDER BY room_id",
        db_connection,
    )
    out["testing_rooms"] = df_room.to_dict(orient="records")

    # File Types
    df_room = pd.read_sql_query(
        "SELECT object_type_id AS id, COALESCE(object_type_name, '') AS label FROM lkp_data_file_object_type ORDER BY object_type_id",
        db_connection,
    )
    out["file_types"] = df_room.to_dict(orient="records")

    # File Types
    df_room = pd.read_sql_query(
        "SELECT drug_rx_id AS id, COALESCE(rx_label, '') AS label FROM drug_rx ORDER BY drug_rx_id",
        db_connection,
    )
    out["rx"] = df_room.to_dict(orient="records")

    return out
