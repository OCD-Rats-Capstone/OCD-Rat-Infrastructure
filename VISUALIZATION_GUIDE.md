# Data Visualization Frontend - User Guide

## Overview

The data visualization page has been integrated into your RatBat 2 application. It allows you to create interactive barcharts by selecting from available dimensions (what to group by) and metrics (what to measure).

---

## How to Access

1. **Open your browser** and go to: `http://localhost`
2. **Click "Visualizations"** in the navigation menu (top navigation bar)
3. You'll see the **Visualization Builder** page

---

## How to Use

### Step 1: Select a Dimension
A **dimension** is what you want to group your data by. Click the "Dimension (Group By)" dropdown and choose one:

- **By Rat ID** - Group data by individual rats
- **By Tester** - Group data by person conducting the test
- **By Apparatus** - Group data by equipment used
- **By Room** - Group data by testing location
- **By Pattern** - Group data by apparatus pattern

### Step 2: Select a Metric
A **metric** is what you want to measure. Click the "Metric (Measure)" dropdown and choose one:

- **Number of Sessions** - Count how many sessions per dimension
- **Average Session Duration** - Average length of sessions (in seconds)
- **Total Duration** - Sum of all session durations (in seconds)
- **Success Rate** - Percentage of successful sessions

### Step 3: View Your Chart
Once you select both a dimension and metric:
1. The system automatically fetches the data
2. An interactive barchart appears
3. You can hover over bars to see exact values
4. Summary statistics are shown below the chart:
   - **Count**: Number of bars/categories
   - **Max**: Highest value
   - **Min**: Lowest value
   - **Average**: Mean of all values

### Step 4: Clear and Try Again
Click **"Clear Selection"** to reset and create a new visualization.

---

## Example Visualizations

### Example 1: Sessions Per Rat
- **Dimension**: By Rat ID
- **Metric**: Number of Sessions
- **Result**: A bar for each rat showing how many sessions it had

### Example 2: Average Duration by Apparatus
- **Dimension**: By Apparatus
- **Metric**: Average Session Duration
- **Result**: A bar for each apparatus showing average session length

### Example 3: Success Rate by Tester
- **Dimension**: By Tester
- **Metric**: Success Rate
- **Result**: A bar for each tester showing their success percentage

---

## Technical Details

### Frontend Components

**1. `VisualizationBuilder.tsx`** (Main Page)
- Handles dimension and metric selection
- Shows control panel with dropdowns
- Displays the chart when both options are selected

**2. `BarChartVisualization.tsx`** (Chart Display)
- Renders the barchart using Recharts
- Shows loading states while fetching
- Displays error messages if something goes wrong
- Shows summary statistics

**3. `useVisualization.ts` (Data Fetching)
- Custom React hooks for fetching available options
- Custom React hooks for fetching visualization data
- Handles loading and error states automatically

### API Endpoints

The frontend uses two backend endpoints:

#### 1. Get Available Options
```
GET /visualizations/available
```
Returns all available dimensions, metrics, and their descriptions.

#### 2. Generate Barchart Data
```
GET /visualizations/barchart?dimension={dimension_id}&metric={metric_id}
```

**Query Parameters:**
- `dimension`: ID of dimension to group by (rat_id, tester_id, apparatus_id, room_id, pattern_id)
- `metric`: ID of metric to aggregate (session_count, average_duration, total_duration, success_rate)

**Response Example:**
```json
{
  "labels": ["1", "2", "3"],
  "values": [10.5, 15.2, 8.9],
  "title": "Number of Sessions by Rat ID",
  "xlabel": "Rat ID",
  "ylabel": "Number of Sessions",
  "raw_data": [...]
}
```

---

## Troubleshooting

### Chart won't load
- Make sure both dimension AND metric are selected
- Check that your backend is running: `http://localhost:8000/docs`
- Check browser console (F12) for error messages

### No data appears
- Your database might not have data for that combination
- Try a different dimension or metric
- Check the backend logs: `docker-compose logs backend`

### Dimension/Metric dropdowns are empty
- The backend might not be responding
- Check backend is running: `docker-compose ps`
- Restart backend: `docker-compose restart backend`

### Styling looks broken
- Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
- Restart frontend: `docker-compose restart frontend`

---

## What's Coming Next?

The visualization system is designed to be extensible. You can easily add:
- ✨ Line charts (for time-series data)
- ✨ Pie charts (for composition)
- ✨ Heatmaps (for two-dimensional data)
- ✨ Date range filters
- ✨ Export to CSV/PNG
- ✨ Saved visualization templates

---

## Questions?

Check the API documentation at: `http://localhost:8000/docs`

Look for the "Visualizations" section and try the endpoints directly!
