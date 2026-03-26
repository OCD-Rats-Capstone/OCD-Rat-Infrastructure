"""Centralized SQL definitions for graph panels.

Define all graph SQL in one place so graph logic and execution wiring stay decoupled.
"""


def _build_checking_qnp_sal_summary_query(variable_name, include_q21_exclusion=True, table_name="session_sm_checking"):
    q21_cte = """
,
q21_excluded_sessions AS (
    SELECT DISTINCT sem.session_id FROM session_experiment_membership sem
    JOIN experiment_groups eg ON sem.group_id = eg.group_id
    WHERE eg.group_id IN (129, 130, 131, 132)
),
filtered_sessions AS (
    SELECT tms.* FROM triple_match_sessions tms
    WHERE NOT EXISTS (SELECT 1 FROM q21_excluded_sessions qes WHERE qes.session_id = tms.session_id)
)
""" if include_q21_exclusion else """
,
filtered_sessions AS (
    SELECT * FROM qnp_sal_sessions
    WHERE cumulative_drug_injection_number BETWEEN 1 AND 10
      AND cumulative_drug_injection_number = cumulative_injections_count_for_regimen
      AND cumulative_drug_injection_number = cumulative_apparatus_exposure_number
)
"""

    triple_match_or_filtered = """
triple_match_sessions AS (
    SELECT * FROM qnp_sal_sessions
    WHERE cumulative_drug_injection_number BETWEEN 1 AND 10
      AND cumulative_drug_injection_number = cumulative_injections_count_for_regimen
      AND cumulative_drug_injection_number = cumulative_apparatus_exposure_number
)""" if include_q21_exclusion else """
filtered_sessions AS (
    SELECT * FROM qnp_sal_sessions
    WHERE cumulative_drug_injection_number BETWEEN 1 AND 10
      AND cumulative_drug_injection_number = cumulative_injections_count_for_regimen
      AND cumulative_drug_injection_number = cumulative_apparatus_exposure_number
)"""

    return f"""
WITH
brain_status_cte AS (
    SELECT es.session_id, es.rat_id, bm.surgery_type, hr.intact_status_id,
        CASE
            WHEN bm.surgery_type = 'Unoperated' THEN 'Unoperated'
            WHEN bm.surgery_type = 'Sham' AND hr.intact_status_id = 0 THEN 'Sham'
            ELSE 'Excluded'
        END AS brain_status
    FROM experimental_sessions es
    LEFT JOIN brain_manipulations bm ON es.effective_manipulation_id = bm.manipulation_id
    LEFT JOIN histology_results hr ON bm.manipulation_id = hr.manipulation_id
),
-- DEVELOPMENT-ONLY SHAM FILTER (applied asymmetrically -- Sham branch only):
-- Rats with exactly 1 brain_manipulation record are pure Unoperated OR DEVELOPMENT Sham.
-- EXPRESSION rats (Unoperated->Sham) have 2 records; their post-surgery Sham sessions
-- are excluded here. Their pre-surgery Unoperated sessions remain valid and are retained
-- in the Unoperated branch, which does NOT apply this single-record restriction.
development_sham_rats AS (
    SELECT rat_id FROM brain_manipulations
    GROUP BY rat_id HAVING COUNT(manipulation_id) = 1
),
sessions_brain_filtered AS (
    SELECT es.*, bsc.brain_status FROM experimental_sessions es
    JOIN brain_status_cte bsc ON es.session_id = bsc.session_id
    WHERE
        bsc.brain_status = 'Unoperated'  -- ALL Unoperated-coded sessions (incl. EXPRESSION pre-surgery)
        OR
        (bsc.brain_status = 'Sham' AND es.rat_id IN (SELECT rat_id FROM development_sham_rats))
),
sessions_apparatus_filtered AS (
    SELECT * FROM sessions_brain_filtered
    WHERE apparatus_id IN (1,2,3,4) AND pattern_id = 1 AND testing_lights_on = TRUE
),
sessions_drug_info AS (
    SELECT saf.session_id, saf.rat_id, saf.brain_status,
        saf.cumulative_drug_injection_number, saf.drug_rx_id,
        sdd.cumulative_injections_count_for_regimen,
        sdd.cumulative_apparatus_exposure_number,
        d.drug_is_active,
        COUNT(CASE WHEN d.drug_is_active = TRUE THEN 1 END) OVER (PARTITION BY saf.session_id) AS active_drug_count,
        COUNT(*) OVER (PARTITION BY saf.session_id) AS total_drug_count
    FROM sessions_apparatus_filtered saf
    JOIN session_drug_details sdd ON saf.session_id = sdd.session_id
    JOIN drugs d ON sdd.drug_id = d.drug_id
    WHERE d.drug_abbreviation NOT IN ('VEHa', 'VEHb')
),
single_drug_sessions AS (
    SELECT DISTINCT session_id, rat_id, brain_status, cumulative_drug_injection_number,
        drug_rx_id, cumulative_injections_count_for_regimen, cumulative_apparatus_exposure_number
    FROM sessions_drug_info WHERE total_drug_count = 1 AND active_drug_count <= 1
),
qnp_sal_sessions AS (
    SELECT sds.*, rx.rx_label AS chronic_regimen FROM single_drug_sessions sds
    JOIN drug_rx rx ON sds.drug_rx_id = rx.drug_rx_id
    WHERE rx.rx_label IN ('QNP 0.5', 'SAL 1')
),
{triple_match_or_filtered}
{q21_cte}
SELECT
    fs.brain_status, fs.chronic_regimen,
    ROUND(AVG(sm.measure_value) FILTER (WHERE fs.cumulative_drug_injection_number = 8)::NUMERIC, 3) AS inj8_mean,
    ROUND((STDDEV(sm.measure_value) FILTER (WHERE fs.cumulative_drug_injection_number = 8)
        / NULLIF(SQRT(COUNT(sm.measure_value) FILTER (WHERE fs.cumulative_drug_injection_number = 8)),0))::NUMERIC, 3) AS inj8_sem,
    COUNT(DISTINCT fs.rat_id) FILTER (WHERE fs.cumulative_drug_injection_number = 8) AS inj8_n,
    ROUND(AVG(sm.measure_value) FILTER (WHERE fs.cumulative_drug_injection_number = 10)::NUMERIC, 3) AS inj10_mean,
    ROUND((STDDEV(sm.measure_value) FILTER (WHERE fs.cumulative_drug_injection_number = 10)
        / NULLIF(SQRT(COUNT(sm.measure_value) FILTER (WHERE fs.cumulative_drug_injection_number = 10)),0))::NUMERIC, 3) AS inj10_sem,
    COUNT(DISTINCT fs.rat_id) FILTER (WHERE fs.cumulative_drug_injection_number = 10) AS inj10_n
FROM filtered_sessions fs
JOIN {table_name} sm ON fs.session_id = sm.session_id
WHERE sm.variable_name = '{variable_name}'
GROUP BY fs.brain_status, fs.chronic_regimen
ORDER BY
    CASE fs.brain_status WHEN 'Unoperated' THEN 1 WHEN 'Sham' THEN 2 END,
    CASE fs.chronic_regimen WHEN 'SAL 1' THEN 1 WHEN 'QNP 0.5' THEN 2 END;
"""


REQUIRED_TABLES_CHECKING = [
    "experimental_sessions",
    "brain_manipulations",
    "histology_results",
    "session_drug_details",
    "drugs",
    "drug_rx",
    "session_sm_checking",
]

REQUIRED_TABLES_SATIETY = [
    "experimental_sessions",
    "brain_manipulations",
    "histology_results",
    "session_drug_details",
    "drugs",
    "drug_rx",
    "session_sm_satiety",
]


GRAPH_QUERY_DEFINITIONS = {
    1: {
        "query_id": 1,
        "slug": "checking-frequency",
        "title": "Panel 1 - Frequency of checking performance",
        "description": "Returns to key locale (#), variable KPcumReturnfreq01.",
        "implemented": True,
        "required_tables": REQUIRED_TABLES_CHECKING,
        "sql": _build_checking_qnp_sal_summary_query("KPcumReturnfreq01"),
        "fallback_sql": _build_checking_qnp_sal_summary_query(
            "KPcumReturnfreq01", include_q21_exclusion=False
        ),
    },
    2: {
        "query_id": 2,
        "slug": "checking-length",
        "title": "Panel 2 - Length of check",
        "description": "Duration of visit to key locale (log s), variable KPmeanStayTime01_lg10_s.",
        "implemented": True,
        "required_tables": REQUIRED_TABLES_CHECKING,
        "sql": _build_checking_qnp_sal_summary_query("KPmeanStayTime01_lg10_s"),
        "fallback_sql": _build_checking_qnp_sal_summary_query(
            "KPmeanStayTime01_lg10_s", include_q21_exclusion=False
        ),
    },
    3: {
        "query_id": 3,
        "slug": "checking-return-time",
        "title": "Panel 3 - Focus on the task of checking -> Return time",
        "description": "Time between checks (s), variable KPreturntime01_s.",
        "implemented": True,
        "required_tables": REQUIRED_TABLES_CHECKING,
        "sql": _build_checking_qnp_sal_summary_query("KPreturntime01_s"),
        "fallback_sql": _build_checking_qnp_sal_summary_query(
            "KPreturntime01_s", include_q21_exclusion=False
        ),
    },
    4: {
        "query_id": 4,
        "slug": "checking-stops-to-return",
        "title": "Panel 4 - Focus on the task of checking -> Stops to return",
        "description": "Number of stops between checks, variable KPstopsToReturn01.",
        "implemented": True,
        "required_tables": REQUIRED_TABLES_CHECKING,
        "sql": _build_checking_qnp_sal_summary_query("KPstopsToReturn01"),
        "fallback_sql": _build_checking_qnp_sal_summary_query(
            "KPstopsToReturn01", include_q21_exclusion=False
        ),
    },
    5: {
        "query_id": 5,
        "slug": "satiety-inter-check-interval",
        "title": "Panel 5 - Satiety following a bout of checking -> Duration of rest",
        "description": "Time to next checking bout (log s), variable DurationOfInterCheckInterval_lg10_s. Note: n may be lower (requires ≥2 checking bouts per session).",
        "implemented": True,
        "required_tables": REQUIRED_TABLES_SATIETY,
        "sql": _build_checking_qnp_sal_summary_query("DurationOfInterCheckInterval_lg10_s", table_name="session_sm_satiety"),
        "fallback_sql": _build_checking_qnp_sal_summary_query(
            "DurationOfInterCheckInterval_lg10_s", include_q21_exclusion=False, table_name="session_sm_satiety"
        ),
    },
}
