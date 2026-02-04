"""
Visualization Service - Business logic for generating data visualization-ready aggregations.
Supports dynamic bar charts with configurable X/Y axes, automatic join resolution, and filtering.

Key Features:
- Configuration-driven design: X_AXIS_REGISTRY and Y_AXIS_REGISTRY map user labels to SQL logic
- Automatic JOIN resolution: Determines which tables to join based on selected axes
- Observation filtering: Supports filtering behavioral metrics by observation codes
- Error handling: Validates selections, checks observation filter requirements, handles NaN/infinity
"""

import pandas as pd
import math
from typing import Dict, List, Any, Optional, Set
from enum import Enum
from dataclasses import dataclass


class VisualizationType(str, Enum):
    """Supported visualization types."""
    BARCHART = "barchart"
    LINECHART = "linechart"


class XAxisType(str, Enum):
    """Available X-axis grouping variables for bar charts."""
    RAT_STRAIN = "rat_strain"
    RAT_SEX = "rat_sex"
    SESSION_TYPE = "session_type"
    APPARATUS = "apparatus"
    LIGHTING_CONDITION = "lighting_condition"
    TESTER = "tester"
    DRUG_COMPOUND = "drug_compound"
    BRAIN_REGION = "brain_region"
    MANIPULATION_TYPE = "manipulation_type"


class XAxisLineChartType(str, Enum):
    """Available X-axis grouping variables for line charts (time-based)."""
    DATE_BY_DAY = "date_by_day"
    DATE_BY_WEEK = "date_by_week"
    DATE_BY_MONTH = "date_by_month"


class YAxisType(str, Enum):
    """Available Y-axis metrics for bar charts."""
    SESSION_COUNT = "session_count"
    UNIQUE_RATS = "unique_rats"
    AVG_BODY_WEIGHT = "avg_body_weight"
    AVG_INJECTION_COUNT = "avg_injection_count"


class YAxisLineChartType(str, Enum):
    """Available Y-axis metrics for line charts."""
    SESSION_COUNT = "session_count"
    UNIQUE_RATS = "unique_rats"
    AVG_BODY_WEIGHT = "avg_body_weight"
    AVG_INJECTION_COUNT = "avg_injection_count"


@dataclass
class XAxisConfig:
    """Configuration for X-axis grouping variable."""
    id: str                                    # Enum value
    label: str                                 # Human-readable label
    description: str                           # UI tooltip text
    required_joins: Set[str]                   # Table aliases to JOIN
    group_by_sql: str                          # SQL for GROUP BY expression
    requires_observation_filter: bool = False  # Whether observation_code is needed


@dataclass
class YAxisConfig:
    """Configuration for Y-axis metric."""
    id: str                                    # Enum value
    label: str                                 # Human-readable label
    description: str                           # UI tooltip text
    unit: str                                  # Unit of measurement
    required_joins: Set[str]                   # Table aliases to JOIN
    aggregation_sql: str                       # SQL for aggregation expression
    requires_observation_filter: bool = False  # Whether observation_code is needed


# ============================================================================
# X-AXIS REGISTRY: Maps X-axis types to their database logic
# ============================================================================

X_AXIS_REGISTRY: Dict[str, XAxisConfig] = {
    XAxisType.RAT_STRAIN.value: XAxisConfig(
        id=XAxisType.RAT_STRAIN.value,
        label="Rat Strain",
        description="Group results by rat strain",
        required_joins={"R1"},
        group_by_sql="COALESCE(R1.strain, 'Unknown')",
    ),
    XAxisType.RAT_SEX.value: XAxisConfig(
        id=XAxisType.RAT_SEX.value,
        label="Rat Sex",
        description="Group results by rat biological sex",
        required_joins={"R1"},
        group_by_sql="COALESCE(R1.sex, 'Unknown')",
    ),
    XAxisType.SESSION_TYPE.value: XAxisConfig(
        id=XAxisType.SESSION_TYPE.value,
        label="Session Type",
        description="Group results by session type (training, testing, etc.)",
        required_joins={"ST"},
        group_by_sql="COALESCE(ST.type_name, 'Unknown')",
    ),
    XAxisType.APPARATUS.value: XAxisConfig(
        id=XAxisType.APPARATUS.value,
        label="Apparatus",
        description="Group results by apparatus/equipment used",
        required_joins={"A1"},
        group_by_sql="COALESCE(A1.apparatus_name, 'Unknown')",
    ),
    XAxisType.LIGHTING_CONDITION.value: XAxisConfig(
        id=XAxisType.LIGHTING_CONDITION.value,
        label="Lighting Condition",
        description="Group results by lighting condition (lights on/off)",
        required_joins=set(),
        group_by_sql="CASE WHEN E1.testing_lights_on THEN 'Lights On' ELSE 'Lights Off' END",
    ),
    XAxisType.TESTER.value: XAxisConfig(
        id=XAxisType.TESTER.value,
        label="Tester",
        description="Group results by experimenter/tester name",
        required_joins={"T1"},
        group_by_sql="COALESCE(T1.first_last_name, 'Unknown')",
    ),
    XAxisType.DRUG_COMPOUND.value: XAxisConfig(
        id=XAxisType.DRUG_COMPOUND.value,
        label="Drug Compound",
        description="Group results by pharmaceutical compound",
        required_joins={"D1", "DRD", "DR"},  # Dependency chain: D1 <- DRD <- DR
        group_by_sql="COALESCE(D1.drug_name, 'No Drug')",
    ),
    XAxisType.BRAIN_REGION.value: XAxisConfig(
        id=XAxisType.BRAIN_REGION.value,
        label="Brain Region",
        description="Group results by brain region of manipulation",
        required_joins={"B1", "BR1"},
        group_by_sql="COALESCE(BR1.region_name, 'Unknown')",
    ),
    XAxisType.MANIPULATION_TYPE.value: XAxisConfig(
        id=XAxisType.MANIPULATION_TYPE.value,
        label="Manipulation Type",
        description="Group results by type of manipulation (surgery, lesion, etc.)",
        required_joins={"B1"},
        group_by_sql="COALESCE(B1.surgery_type, 'Unknown')",
    ),
}

# ============================================================================
# LINE CHART X-AXIS REGISTRY: Maps time-based X-axis types for line charts
# ============================================================================

LINECHART_X_AXIS_REGISTRY: Dict[str, XAxisConfig] = {
    XAxisLineChartType.DATE_BY_DAY.value: XAxisConfig(
        id=XAxisLineChartType.DATE_BY_DAY.value,
        label="Date (Daily)",
        description="Group results by day",
        required_joins=set(),
        group_by_sql="DATE(E1.session_timestamp)",
    ),
    XAxisLineChartType.DATE_BY_WEEK.value: XAxisConfig(
        id=XAxisLineChartType.DATE_BY_WEEK.value,
        label="Date (Weekly)",
        description="Group results by week",
        required_joins=set(),
        group_by_sql="DATE_TRUNC('week', E1.session_timestamp)::date",
    ),
    XAxisLineChartType.DATE_BY_MONTH.value: XAxisConfig(
        id=XAxisLineChartType.DATE_BY_MONTH.value,
        label="Date (Monthly)",
        description="Group results by month",
        required_joins=set(),
        group_by_sql="DATE_TRUNC('month', E1.session_timestamp)::date",
    ),
}

# ============================================================================
# LINE CHART Y-AXIS REGISTRY: Maps Y-axis metrics for line charts
# (Same as bar chart but could be extended in future)
# ============================================================================

LINECHART_Y_AXIS_REGISTRY: Dict[str, YAxisConfig] = {
    YAxisLineChartType.SESSION_COUNT.value: YAxisConfig(
        id=YAxisLineChartType.SESSION_COUNT.value,
        label="Session Count",
        description="Number of sessions",
        unit="count",
        required_joins=set(),
        aggregation_sql="COUNT(DISTINCT E1.session_id)",
    ),
    YAxisLineChartType.UNIQUE_RATS.value: YAxisConfig(
        id=YAxisLineChartType.UNIQUE_RATS.value,
        label="Unique Rats",
        description="Number of unique rats",
        unit="count",
        required_joins=set(),
        aggregation_sql="COUNT(DISTINCT E1.rat_id)",
    ),
    YAxisLineChartType.AVG_BODY_WEIGHT.value: YAxisConfig(
        id=YAxisLineChartType.AVG_BODY_WEIGHT.value,
        label="Average Body Weight",
        description="Average body weight of rats",
        unit="grams",
        required_joins=set(),
        aggregation_sql="COALESCE(ROUND(AVG(CAST(E1.body_weight_grams AS NUMERIC)), 2), 0)",
    ),
    YAxisLineChartType.AVG_INJECTION_COUNT.value: YAxisConfig(
        id=YAxisLineChartType.AVG_INJECTION_COUNT.value,
        label="Average Injection Count",
        description="Average number of drug injections",
        unit="count",
        required_joins=set(),
        aggregation_sql="COALESCE(ROUND(AVG(CAST(E1.cumulative_drug_injection_number AS NUMERIC)), 2), 0)",
    ),
}

Y_AXIS_REGISTRY: Dict[str, YAxisConfig] = {
    YAxisType.SESSION_COUNT.value: YAxisConfig(
        id=YAxisType.SESSION_COUNT.value,
        label="Session Count",
        description="Number of sessions",
        unit="count",
        required_joins=set(),
        aggregation_sql="COUNT(DISTINCT E1.session_id)",
    ),
    YAxisType.UNIQUE_RATS.value: YAxisConfig(
        id=YAxisType.UNIQUE_RATS.value,
        label="Unique Rats",
        description="Number of unique rats",
        unit="count",
        required_joins=set(),
        aggregation_sql="COUNT(DISTINCT E1.rat_id)",
    ),
    YAxisType.AVG_BODY_WEIGHT.value: YAxisConfig(
        id=YAxisType.AVG_BODY_WEIGHT.value,
        label="Average Body Weight",
        description="Average body weight of rats",
        unit="grams",
        required_joins=set(),
        aggregation_sql="COALESCE(ROUND(AVG(CAST(E1.body_weight_grams AS NUMERIC)), 2), 0)",
    ),
    YAxisType.AVG_INJECTION_COUNT.value: YAxisConfig(
        id=YAxisType.AVG_INJECTION_COUNT.value,
        label="Average Injection Count",
        description="Average number of drug injections",
        unit="count",
        required_joins=set(),
        aggregation_sql="COALESCE(ROUND(AVG(CAST(E1.cumulative_drug_injection_number AS NUMERIC)), 2), 0)",
    ),
}


def get_available_visualizations() -> Dict[str, List[Dict[str, Any]]]:
    """
    Get all available visualization configuration options for the frontend.
    
    Returns:
        Dictionary with:
        - x_axis_options: List of X-axis configuration objects for bar charts
        - y_axis_options: List of Y-axis configuration objects for bar charts
        - linechart_x_axis_options: List of X-axis configuration objects for line charts
        - linechart_y_axis_options: List of Y-axis configuration objects for line charts
    """
    x_axis_options = [
        {
            "id": config.id,
            "label": config.label,
            "description": config.description,
        }
        for config in X_AXIS_REGISTRY.values()
    ]
    
    y_axis_options = [
        {
            "id": config.id,
            "label": config.label,
            "description": config.description,
            "unit": config.unit,
        }
        for config in Y_AXIS_REGISTRY.values()
    ]
    
    linechart_x_axis_options = [
        {
            "id": config.id,
            "label": config.label,
            "description": config.description,
        }
        for config in LINECHART_X_AXIS_REGISTRY.values()
    ]
    
    linechart_y_axis_options = [
        {
            "id": config.id,
            "label": config.label,
            "description": config.description,
            "unit": config.unit,
        }
        for config in LINECHART_Y_AXIS_REGISTRY.values()
    ]
    
    return {
        "x_axis_options": x_axis_options,
        "y_axis_options": y_axis_options,
        "linechart_x_axis_options": linechart_x_axis_options,
        "linechart_y_axis_options": linechart_y_axis_options,
    }


def get_available_observation_codes(db_connection) -> List[Dict[str, str]]:
    """
    Get list of available observation codes for behavioral metric filtering.
    
    Args:
        db_connection: Database connection object (psycopg2)
        
    Returns:
        List of observation code dictionaries with 'code' and 'label' keys
    """
    try:
        cur = db_connection.cursor()
        
        # Query distinct observation codes from session_observations table
        cur.execute("""
            SELECT DISTINCT observation_code 
            FROM session_observations 
            WHERE observation_code IS NOT NULL
            ORDER BY observation_code
        """)
        
        codes = cur.fetchall()
        cur.close()
        
        # Format as list of dicts with code and label (label = code for now)
        return [{"code": code[0], "label": code[0]} for code in codes]
    except Exception:
        # If query fails, return empty list (don't crash)
        return []


def generate_barchart_data(
    db_connection,
    x_axis: str,
    y_axis: str,
    observation_code: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate bar chart data with dynamic X and Y axes.
    
    Args:
        db_connection: psycopg2 database connection
        x_axis: X-axis variable ID from XAxisType (e.g., 'rat_strain', 'tester')
        y_axis: Y-axis metric ID from YAxisType (e.g., 'session_count', 'avg_body_weight')
        observation_code: Optional observation code filter for behavioral metrics
        
    Returns:
        Dictionary with:
        - labels: X-axis category labels
        - values: Y-axis aggregated values
        - title: Chart title
        - xlabel: X-axis label
        - ylabel: Y-axis label
        - unit: Unit of measurement
        - raw_data: Complete aggregated data
        
    Raises:
        ValueError: If x_axis, y_axis are invalid or observation_code is required but missing
    """
    # Validate x_axis and y_axis selections
    if x_axis not in X_AXIS_REGISTRY:
        raise ValueError(f"Invalid x_axis '{x_axis}'. Valid options: {list(X_AXIS_REGISTRY.keys())}")
    if y_axis not in Y_AXIS_REGISTRY:
        raise ValueError(f"Invalid y_axis '{y_axis}'. Valid options: {list(Y_AXIS_REGISTRY.keys())}")
    
    x_config = X_AXIS_REGISTRY[x_axis]
    y_config = Y_AXIS_REGISTRY[y_axis]
    
    # Check if observation_code is required
    if (x_config.requires_observation_filter or y_config.requires_observation_filter):
        if not observation_code:
            raise ValueError(
                f"observation_code is required for '{y_config.label}'. "
                f"Provide observation_code query parameter."
            )
    
    # Build and execute query
    query = _build_query(x_config, y_config, observation_code)
    
    try:
        cur = db_connection.cursor()
        cur.execute(query)
        rows = cur.fetchall()
        
        # Get column names
        col_names = [desc[0] for desc in cur.description]
        cur.close()
        
        # Convert to DataFrame for easier manipulation
        df = pd.DataFrame(rows, columns=col_names)
        
        if df.empty:
            return {
                "labels": [],
                "values": [],
                "title": f"{y_config.label} by {x_config.label}",
                "xlabel": x_config.label,
                "ylabel": y_config.label,
                "unit": y_config.unit,
                "raw_data": [],
            }
        
        # Extract labels and values
        labels = df.iloc[:, 0].astype(str).tolist()
        values = df.iloc[:, 1].tolist()
        
        # Clean NaN/infinity values for JSON serialization
        cleaned_values = []
        for v in values:
            if isinstance(v, float):
                if math.isnan(v) or math.isinf(v):
                    cleaned_values.append(0)
                else:
                    cleaned_values.append(v)
            else:
                cleaned_values.append(v if v is not None else 0)
        
        # Format raw_data
        raw_data = [
            {col_names[0]: str(row[0]), col_names[1]: row[1]}
            for row in rows
        ]
        
        return {
            "labels": labels,
            "values": cleaned_values,
            "title": f"{y_config.label} by {x_config.label}",
            "xlabel": x_config.label,
            "ylabel": y_config.label,
            "unit": y_config.unit,
            "raw_data": raw_data,
        }
    
    except Exception as e:
        raise Exception(f"Database query failed: {str(e)}")


def _build_query(
    x_config: XAxisConfig,
    y_config: YAxisConfig,
    observation_code: Optional[str] = None,
) -> str:
    """
    Build dynamic SQL query based on selected axes and configurations.
    
    Args:
        x_config: X-axis configuration object
        y_config: Y-axis configuration object
        observation_code: Optional observation code filter
        
    Returns:
        Complete SQL SELECT query string
    """
    # Determine all required joins
    required_joins = x_config.required_joins | y_config.required_joins
    
    # Replace C1 with D1 if present (for backwards compatibility)
    if "C1" in required_joins:
        required_joins.discard("C1")
        required_joins.add("D1")
    
    # Build query components
    select_clause = f"SELECT {x_config.group_by_sql} as dimension, {y_config.aggregation_sql} as value"
    from_clause = _build_from_clause(required_joins)
    where_clause = _build_where_clause(required_joins, observation_code)
    group_by_clause = f"GROUP BY {x_config.group_by_sql}"
    order_by_clause = f"ORDER BY {x_config.group_by_sql}"
    
    query = f"""
    {select_clause}
    {from_clause}
    {where_clause}
    {group_by_clause}
    {order_by_clause}
    """
    
    return query


def _build_from_clause(required_joins: Set[str]) -> str:
    """
    Build FROM clause with appropriate JOINs based on required tables.
    
    Args:
        required_joins: Set of table alias names (e.g., {"R1", "T1", "OBS"})
        
    Returns:
        FROM clause with all necessary JOINs
    """
    from_clause = "FROM experimental_sessions AS E1"
    
    # Define join definitions with their conditions
    join_definitions = {
        "R1": "LEFT JOIN rats AS R1 ON R1.rat_id = E1.rat_id",
        "T1": "LEFT JOIN testers AS T1 ON T1.tester_id = E1.tester_id",
        "A1": "LEFT JOIN apparatuses AS A1 ON A1.apparatus_id = E1.apparatus_id",
        "AP1": "LEFT JOIN apparatus_patterns AS AP1 ON AP1.pattern_id = E1.apparatus_pattern_id",
        "TR1": "LEFT JOIN testing_rooms AS TR1 ON TR1.room_id = E1.testing_room_id",
        "B1": "LEFT JOIN brain_manipulations AS B1 ON B1.rat_id = E1.rat_id",
        "BR1": "LEFT JOIN brain_regions AS BR1 ON BR1.region_id = B1.target_region_id",
        "ST": "LEFT JOIN session_types AS ST ON ST.session_type_id = E1.session_type_id",
        "DR": "LEFT JOIN drug_rx AS DR ON DR.drug_rx_id = E1.drug_rx_id",
        "DRD": "LEFT JOIN drug_rx_details AS DRD ON DRD.drug_rx_id = DR.drug_rx_id",
        "D1": "LEFT JOIN drugs AS D1 ON D1.drug_id = DRD.drug_id",
        "OBS": "LEFT JOIN session_observations AS OBS ON OBS.session_id = E1.session_id",
    }
    
    # Add joins in dependency order to prevent reference errors
    join_order = ["R1", "T1", "A1", "AP1", "TR1", "B1", "BR1", "ST", "DR", "DRD", "D1", "OBS"]
    
    for alias in join_order:
        if alias in required_joins:
            from_clause += f"\n{join_definitions[alias]}"
    
    return from_clause


def _build_where_clause(required_joins: Set[str], observation_code: Optional[str] = None) -> str:
    """
    Build WHERE clause with appropriate filters.
    
    Args:
        required_joins: Set of table aliases (for context)
        observation_code: Optional observation code to filter by
        
    Returns:
        WHERE clause with filters
    """
    conditions = ["E1.session_id IS NOT NULL"]
    
    # Add observation code filter if provided
    if observation_code:
        # Escape single quotes to prevent SQL injection
        safe_code = observation_code.replace("'", "''")
        conditions.append(f"OBS.observation_code = '{safe_code}'")
    
    return "WHERE " + " AND ".join(conditions)


def generate_linechart_data(
    db_connection,
    x_axis: str,
    y_axis: str,
) -> Dict[str, Any]:
    """
    Generate line chart data with time-based X-axis and configurable Y-axis metrics.
    
    Args:
        db_connection: psycopg2 database connection
        x_axis: X-axis time binning option from XAxisLineChartType (e.g., 'date_by_day', 'date_by_month')
        y_axis: Y-axis metric ID from YAxisLineChartType (e.g., 'session_count', 'avg_body_weight')
        
    Returns:
        Dictionary with:
        - labels: X-axis date labels
        - values: Y-axis aggregated values
        - title: Chart title
        - xlabel: X-axis label
        - ylabel: Y-axis label
        - unit: Unit of measurement
        - raw_data: Complete aggregated data
        
    Raises:
        ValueError: If x_axis or y_axis are invalid
    """
    # Validate x_axis and y_axis selections
    if x_axis not in LINECHART_X_AXIS_REGISTRY:
        raise ValueError(f"Invalid x_axis '{x_axis}'. Valid options: {list(LINECHART_X_AXIS_REGISTRY.keys())}")
    if y_axis not in LINECHART_Y_AXIS_REGISTRY:
        raise ValueError(f"Invalid y_axis '{y_axis}'. Valid options: {list(LINECHART_Y_AXIS_REGISTRY.keys())}")
    
    x_config = LINECHART_X_AXIS_REGISTRY[x_axis]
    y_config = LINECHART_Y_AXIS_REGISTRY[y_axis]
    
    # Build and execute query
    query = _build_linechart_query(x_config, y_config)
    
    try:
        cur = db_connection.cursor()
        cur.execute(query)
        rows = cur.fetchall()
        
        # Get column names
        col_names = [desc[0] for desc in cur.description]
        cur.close()
        
        # Convert to DataFrame for easier manipulation
        df = pd.DataFrame(rows, columns=col_names)
        
        if df.empty:
            return {
                "labels": [],
                "values": [],
                "title": f"{y_config.label} Over Time",
                "xlabel": x_config.label,
                "ylabel": y_config.label,
                "unit": y_config.unit,
                "raw_data": [],
            }
        
        # Extract labels and values, sorting by date
        df = df.sort_values(by=col_names[0])
        labels = df.iloc[:, 0].astype(str).tolist()
        values = df.iloc[:, 1].tolist()
        
        # Clean NaN/infinity values for JSON serialization
        cleaned_values = []
        for v in values:
            if isinstance(v, float):
                if math.isnan(v) or math.isinf(v):
                    cleaned_values.append(0)
                else:
                    cleaned_values.append(v)
            else:
                cleaned_values.append(v if v is not None else 0)
        
        # Format raw_data
        raw_data = [
            {col_names[0]: str(row[0]), col_names[1]: row[1]}
            for row in rows
        ]
        
        return {
            "labels": labels,
            "values": cleaned_values,
            "title": f"{y_config.label} Over Time",
            "xlabel": x_config.label,
            "ylabel": y_config.label,
            "unit": y_config.unit,
            "raw_data": raw_data,
        }
    
    except Exception as e:
        raise Exception(f"Database query failed: {str(e)}")


def _build_linechart_query(
    x_config: XAxisConfig,
    y_config: YAxisConfig,
) -> str:
    """
    Build SQL query for line chart data based on selected time period and metric.
    
    Args:
        x_config: X-axis configuration object (time-based)
        y_config: Y-axis configuration object
        
    Returns:
        Complete SQL SELECT query string
    """
    # Determine all required joins
    required_joins = x_config.required_joins | y_config.required_joins
    
    # Build query components
    select_clause = f"SELECT {x_config.group_by_sql} as date_point, {y_config.aggregation_sql} as value"
    from_clause = _build_from_clause(required_joins)
    where_clause = _build_where_clause(required_joins)
    group_by_clause = f"GROUP BY {x_config.group_by_sql}"
    order_by_clause = f"ORDER BY {x_config.group_by_sql}"
    
    query = f"""
    {select_clause}
    {from_clause}
    {where_clause}
    {group_by_clause}
    {order_by_clause}
    """
    
    return query
