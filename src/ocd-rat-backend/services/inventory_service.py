"""
Inventory Service - Counts by raw data object type under optional filters.
Entity = data types (lkp_data_file_object_type); sessions are the filtered unit.
"""

from __future__ import annotations

import pandas as pd
from typing import Any
import json

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
    params: list[Any] = []

    # Prepare params for (val IS NULL OR col = val) pattern.
    # We repeat the parameter twice for most filters: once for the NULL check, once for equality.

    # 1. Apparatus
    params.extend([req.apparatus_id, req.apparatus_id])

    # 2. Pattern
    params.extend([req.pattern_id, req.pattern_id])

    # 3. Session Type
    params.extend([req.session_type_id, req.session_type_id])

    # 4. Room
    params.extend([req.room_id, req.room_id])

    # 5. Effective Manipulation
    params.extend([req.effective_manipulation_id, req.effective_manipulation_id])

    # 6. Surgery Type
    params.extend([req.surgery_type, req.surgery_type])

    # 7. Target Region
    params.extend([req.target_region_id, req.target_region_id])

    # 8. Drugs
    # If req.drug_ids is None or empty, we want to bypass this filter.
    # passing None to %s::int[] IS NULL will return true.
    drugs_param = req.drug_ids if req.drug_ids else None
    drugs_len = len(req.drug_ids) if req.drug_ids else 0
    params.extend([drugs_param, drugs_param, drugs_len])

    # Static SQL string with no interpolation
    sql = """
        WITH filtered_sessions AS (
            SELECT E.session_id
            FROM experimental_sessions E
            LEFT JOIN brain_manipulations BM ON E.effective_manipulation_id = BM.manipulation_id
            WHERE 
                (%s::int IS NULL OR E.apparatus_id = %s)
                AND (%s::int IS NULL OR E.pattern_id = %s)
                AND (%s::int IS NULL OR E.session_type_id = %s)
                AND (%s::int IS NULL OR E.room_id = %s)
                AND (%s::int IS NULL OR E.effective_manipulation_id = %s)
                AND (%s::text IS NULL OR BM.surgery_type = %s)
                AND (%s::int IS NULL OR BM.target_region_id = %s)
                AND (
                    %s::int[] IS NULL 
                    OR E.drug_rx_id IN (
                        SELECT drug_rx_id FROM drug_rx_details
                        WHERE drug_id = ANY(%s)
                        GROUP BY drug_rx_id
                        HAVING COUNT(DISTINCT drug_id) = %s
                    )
                )
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
        print(str(df["session_id"]))
        data = df["session_id"].to_list()
        with open("Filter_sessions.json", "w") as f:
            json.dump(data,f,indent=2)

        return df.to_dict(orient="records")
    except Exception as e:
        print(f"[Inventory Service] Error fetching sessions: {e}")
        raise
