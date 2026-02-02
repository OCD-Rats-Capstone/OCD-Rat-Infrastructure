"""
Inventory Service - Counts by raw data object type under optional filters.
Entity = data types (lkp_data_file_object_type); sessions are the filtered unit.
"""

from __future__ import annotations

import pandas as pd
from typing import Any

from schemas.query import (
    InventoryCountsRequest,
    DataTypeCount,
    InventoryCountsResponse,
    INVENTORY_SESSIONS_LIMIT,
)


def get_inventory_counts(req: InventoryCountsRequest, db_connection) -> InventoryCountsResponse:
    """
    Return counts per data type for sessions matching the filter set.
    All provided filters are ANDed. drug_ids means regimen must contain ALL listed drugs.
    """
    sql_cte, params = _build_filtered_sessions_sql(req)
    sql_filtered = sql_cte
    sql_counts = """
        SELECT OT.object_type_id, OT.object_type_name,
               COUNT(SDF.data_file_id) AS file_count,
               COUNT(DISTINCT SDF.session_id) AS session_count
        FROM filtered_sessions FS
        JOIN session_data_files SDF ON SDF.session_id = FS.session_id
        JOIN lkp_data_file_object_type OT ON OT.object_type_id = SDF.object_type_id
        GROUP BY OT.object_type_id, OT.object_type_name
        ORDER BY OT.object_type_id
    """
    sql_total = "SELECT COUNT(*) AS n FROM filtered_sessions"

    full_counts = sql_filtered + sql_counts
    full_total = sql_filtered + sql_total

    try:
        df_counts = pd.read_sql_query(full_counts, db_connection, params=params)
        df_total = pd.read_sql_query(full_total, db_connection, params=params)
        total_sessions = int(df_total["n"].iloc[0]) if len(df_total) > 0 else 0

        counts_by_type = [
            DataTypeCount(
                object_type_id=int(row["object_type_id"]),
                object_type_name=str(row["object_type_name"] or ""),
                file_count=int(row["file_count"]),
                session_count=int(row["session_count"]),
            )
            for _, row in df_counts.iterrows()
        ]
    except Exception as e:
        print(f"[Inventory Service] Database query error: {e}")
        raise

    return InventoryCountsResponse(total_sessions=total_sessions, counts_by_type=counts_by_type)


def _build_filtered_sessions_sql(req: InventoryCountsRequest) -> tuple[str, list[Any]]:
    """Build CTE for filtered sessions. Returns (sql_cte_string, params)."""
    conditions: list[str] = ["1=1"]
    params: list[Any] = []

    if req.drug_ids:
        placeholders = ",".join(["%s"] * len(req.drug_ids))
        conditions.append(
            f"""E.drug_rx_id IN (
                SELECT drug_rx_id FROM drug_rx_details
                WHERE drug_id IN ({placeholders})
                GROUP BY drug_rx_id
                HAVING COUNT(DISTINCT drug_id) = %s
            )"""
        )
        params.extend(req.drug_ids)
        params.append(len(req.drug_ids))

    if req.apparatus_id is not None:
        conditions.append("E.apparatus_id = %s")
        params.append(req.apparatus_id)
    if req.pattern_id is not None:
        conditions.append("E.pattern_id = %s")
        params.append(req.pattern_id)
    if req.session_type_id is not None:
        conditions.append("E.session_type_id = %s")
        params.append(req.session_type_id)
    if req.room_id is not None:
        conditions.append("E.room_id = %s")
        params.append(req.room_id)
    if req.effective_manipulation_id is not None:
        conditions.append("E.effective_manipulation_id = %s")
        params.append(req.effective_manipulation_id)
    if req.surgery_type is not None:
        conditions.append("BM.surgery_type = %s")
        params.append(req.surgery_type)
    if req.target_region_id is not None:
        conditions.append("BM.target_region_id = %s")
        params.append(req.target_region_id)

    where_sql = " AND ".join(conditions)
    brain_join = ""
    if req.surgery_type is not None or req.target_region_id is not None:
        brain_join = "LEFT JOIN brain_manipulations BM ON E.effective_manipulation_id = BM.manipulation_id"

    sql = f"""
        WITH filtered_sessions AS (
            SELECT E.session_id
            FROM experimental_sessions E
            {brain_join}
            WHERE {where_sql}
        )
    """
    return sql, params


def get_inventory_sessions(
    req: InventoryCountsRequest,
    db_connection,
    limit: int = INVENTORY_SESSIONS_LIMIT,
) -> list[dict]:
    """
    Return session list (session_id, legacy_session_id, session_timestamp, rat_id, etc.)
    for sessions matching the same filter set as counts. Capped at limit for performance.
    """
    limit = min(limit, INVENTORY_SESSIONS_LIMIT)
    sql_cte, params = _build_filtered_sessions_sql(req)
    params.append(limit)
    sql = sql_cte + """
        SELECT E.session_id, E.legacy_session_id, E.session_timestamp, E.rat_id,
               E.apparatus_id, E.session_type_id, E.drug_rx_id, E.effective_manipulation_id
        FROM filtered_sessions FS
        JOIN experimental_sessions E ON E.session_id = FS.session_id
        ORDER BY E.session_timestamp DESC NULLS LAST
        LIMIT %s
    """
    try:
        df = pd.read_sql_query(sql, db_connection, params=params)
        df = df.replace([pd.NA], None)
        return df.to_dict(orient="records")
    except Exception as e:
        print(f"[Inventory Service] Error fetching sessions: {e}")
        raise
