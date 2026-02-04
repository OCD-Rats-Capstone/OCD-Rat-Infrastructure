# New Visualization Type: Line Chart

## Overview

A new **Line Chart** visualization type has been added to the OCD-Rat Infrastructure web application. This visualization is designed specifically for displaying **time-series data**, showing how metrics change over time.

---

## When to Use Each Visualization Type

### Bar Chart (Original)
- **Use for**: Categorical comparisons
- **X-axis**: Grouping variables (e.g., by rat strain, tester, apparatus, etc.)
- **Y-axis**: Aggregated metrics (counts, averages)
- **Example**: "Compare average body weight across different rat strains"

### Line Chart (New)
- **Use for**: Time-series trends
- **X-axis**: Time periods (daily, weekly, or monthly bins)
- **Y-axis**: Aggregated metrics over time
- **Example**: "Show how average body weight changes over the months" or "Track session count per day"

---

## Line Chart Features

### Supported X-Axis Options (Time-Based)
1. **Date (Daily)** (`date_by_day`)
   - Groups data by individual days
   - Useful for high-frequency monitoring
   - Shows fine-grained temporal patterns

2. **Date (Weekly)** (`date_by_week`)
   - Groups data by calendar week
   - Good for medium-term trend analysis
   - Smooths out daily variations

3. **Date (Monthly)** (`date_by_month`)
   - Groups data by calendar month
   - Useful for long-term trends
   - Aggregates data at a high level

### Supported Y-Axis Metrics
The line chart supports the same metrics as the bar chart:
1. **Session Count** - Number of experimental sessions per time period
2. **Unique Rats** - Number of distinct rats participating per time period
3. **Average Body Weight** - Average rat body weight per time period (grams)
4. **Average Injection Count** - Average cumulative drug injections per time period

---

## Implementation Details

### Backend Changes

#### 1. New Enums (`visualization_service.py`)
```python
class VisualizationType(str, Enum):
    BARCHART = "barchart"
    LINECHART = "linechart"

class XAxisLineChartType(str, Enum):
    DATE_BY_DAY = "date_by_day"
    DATE_BY_WEEK = "date_by_week"
    DATE_BY_MONTH = "date_by_month"

class YAxisLineChartType(str, Enum):
    SESSION_COUNT = "session_count"
    UNIQUE_RATS = "unique_rats"
    AVG_BODY_WEIGHT = "avg_body_weight"
    AVG_INJECTION_COUNT = "avg_injection_count"
```

#### 2. New Registries
- **`LINECHART_X_AXIS_REGISTRY`**: Maps time-based X-axis options to SQL GROUP BY expressions
- **`LINECHART_Y_AXIS_REGISTRY`**: Maps Y-axis metrics to SQL aggregation expressions

#### 3. New Service Functions
- **`generate_linechart_data(db_connection, x_axis, y_axis)`**: Generates line chart data with proper time-series ordering
- **`_build_linechart_query(x_config, y_config)`**: Builds the SQL query for line chart data

#### 4. New API Endpoint
**Endpoint**: `GET /visualizations/linechart`

**Query Parameters**:
- `x_axis` (required): Time binning option (`date_by_day`, `date_by_week`, or `date_by_month`)
- `y_axis` (required): Metric to aggregate (`session_count`, `unique_rats`, `avg_body_weight`, `avg_injection_count`)

**Example Requests**:
```
GET /visualizations/linechart?x_axis=date_by_month&y_axis=session_count
→ Sessions per month over time

GET /visualizations/linechart?x_axis=date_by_week&y_axis=avg_body_weight
→ Average body weight per week over time
```

**Response Format** (same as bar chart):
```json
{
  "labels": ["2025-01-01", "2025-02-01", "2025-03-01"],
  "values": [45.2, 48.1, 52.3],
  "title": "Average Body Weight Over Time",
  "xlabel": "Date (Monthly)",
  "ylabel": "Average Body Weight",
  "unit": "grams",
  "raw_data": [...]
}
```

### Frontend Changes

#### 1. New Component: `LineChartVisualization.tsx`
- React component that renders line charts using Recharts
- Features:
  - Interactive line chart with hover tooltips
  - Summary statistics (Data Points, Max, Min, Average)
  - Proper error handling for missing/invalid data
  - Responsive design

#### 2. New Hook: `useLineChartData`
- React hook in `useVisualization.ts`
- Fetches line chart data from the `/visualizations/linechart` endpoint
- Handles loading and error states
- Automatically triggers refetch when x_axis or y_axis changes

#### 3. Updated Component: `VisualizationBuilder.tsx`
- Now allows users to select between visualization types (Bar Chart vs Line Chart)
- Dynamically displays appropriate X-axis options based on selected type
- Resets selections when switching chart types (since axes differ)
- Renders appropriate chart component based on selection

#### 4. Updated Types: `useVisualization.ts`
- `AvailableVisualizations` interface now includes:
  - `linechart_x_axis_options`: Available time-based grouping options
  - `linechart_y_axis_options`: Available metrics for line charts

---

## Data Constraints by Visualization Type

The system enforces that only appropriate data combinations are available:

### Bar Chart Constraints
- **X-axis**: Limited to categorical/grouping variables (strain, sex, apparatus, etc.)
- **Y-axis**: Limited to aggregatable metrics (counts, averages)
- **Result**: Prevents meaningless combinations like "average by session count"

### Line Chart Constraints
- **X-axis**: Limited to time-based bins (daily, weekly, monthly)
- **Y-axis**: Limited to metrics that can be aggregated over time
- **Result**: Ensures time-series makes sense (prevents grouping by strain on time axis)

---

## SQL Implementation

### Date Grouping SQL Expressions
- **Daily**: `DATE(E1.session_timestamp)`
- **Weekly**: `DATE_TRUNC('week', E1.session_timestamp)::date`
- **Monthly**: `DATE_TRUNC('month', E1.session_timestamp)::date`

### Data Ordering
Line chart data is automatically sorted by the time dimension to ensure proper visualization continuity.

---

## User Experience

### Step-by-Step Usage

1. **Navigate to Visualizations page**
2. **Select visualization type**: 
   - Click "Bar Chart" for categorical comparisons
   - Click "Line Chart" for time-series trends
3. **Select X-axis** (grouping variable for bar chart, time period for line chart)
4. **Select Y-axis** (metric to visualize)
5. **View chart** with interactive features:
   - Hover over data points for exact values
   - View summary statistics below the chart

---

## Examples

### Example 1: Session Count Over Time (Monthly)
- **Type**: Line Chart
- **X-axis**: Date (Monthly)
- **Y-axis**: Session Count
- **Shows**: How experimental session volume changes month-to-month

### Example 2: Average Body Weight Over Time (Weekly)
- **Type**: Line Chart
- **X-axis**: Date (Weekly)
- **Y-axis**: Average Body Weight
- **Shows**: Trends in rat health/weight over weeks

### Example 3: Unique Rats Per Day
- **Type**: Line Chart
- **X-axis**: Date (Daily)
- **Y-axis**: Unique Rats
- **Shows**: How many different rats were tested each day

### Example 4: Sessions by Rat Strain (Categorical)
- **Type**: Bar Chart
- **X-axis**: Rat Strain
- **Y-axis**: Session Count
- **Shows**: Which strains are used most frequently

---

## Technical Architecture

```
User Interface (React)
├── VisualizationBuilder.tsx (selector for chart type and axes)
├── BarChartVisualization.tsx (bar chart rendering)
└── LineChartVisualization.tsx (line chart rendering)
    ├── useVisualizationData (bar chart hook)
    └── useLineChartData (line chart hook)
         ↓ HTTP GET requests
Backend API (FastAPI)
├── GET /visualizations/available (returns all options for both types)
├── GET /visualizations/barchart (bar chart data endpoint)
└── GET /visualizations/linechart (line chart data endpoint)
    ↓ SQL queries
Database (PostgreSQL)
└── experimental_sessions table (central hub)
    └── Joined with related tables as needed
```

---

## Future Enhancement Opportunities

1. **Additional Visualization Types**:
   - Pie charts (proportional representation)
   - Scatter plots (correlation analysis)
   - Heatmaps (2D categorical comparisons)

2. **Advanced Time Options**:
   - Quarterly aggregation
   - Custom date range selection
   - Holiday-aware grouping

3. **Enhanced Metrics**:
   - Behavioral frequency/duration metrics (already supported in backend, just need UI)
   - Calculated metrics (e.g., sessions per rat)

4. **Interactive Features**:
   - Date range picker for line charts
   - Export charts as images
   - Drill-down capabilities

---

## Testing Checklist

- [ ] Line chart renders correctly with sample data
- [ ] Time-based X-axis properly bins and sorts data
- [ ] Switching between bar and line chart resets selections
- [ ] Only time-based X-axis options appear for line chart
- [ ] Only compatible Y-axis metrics appear for both chart types
- [ ] Error messages display correctly for invalid selections
- [ ] Summary statistics calculate correctly
- [ ] Hover tooltips show proper values
- [ ] Responsive design works on mobile/tablet
- [ ] Line chart handles edge cases (empty data, single point, etc.)

