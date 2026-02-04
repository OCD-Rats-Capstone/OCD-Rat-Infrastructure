# Line Chart Image Setup

## Current Status
The Line Chart visualization has been successfully integrated into the application with separate cards on the Visualizations page. The code is ready to accept a line chart image.

## How to Add Your Line Chart Image

### Step 1: Add the Image File
Place your line chart image in the assets directory:
```
src/ocd-rat-frontend/src/assets/linechart.png
```

### Step 2: Import the Image
In `src/ocd-rat-frontend/src/pages/Visualizations.tsx`, uncomment the import statement:

**Current (line 7):**
```typescript
// TODO: Import line chart image here when provided
// import LineChartImg from "@/assets/linechart.png";
```

**Update to:**
```typescript
import LineChartImg from "@/assets/linechart.png";
```

### Step 3: Update the Card Reference
On line 17, replace the placeholder:

**Current:**
```typescript
{
  img: ChartImg, // TODO: Replace with LineChartImg when image is provided
  title: 'Line Chart',
  ...
}
```

**Update to:**
```typescript
{
  img: LineChartImg,
  title: 'Line Chart',
  ...
}
```

### Step 4: Rebuild
```bash
docker compose down
docker compose up -d --build
```

## File Structure

```
src/ocd-rat-frontend/src/
├── pages/
│   ├── BarChart.tsx          ← Bar chart page
│   ├── LineChart.tsx         ← Line chart page (NEW)
│   └── Visualizations.tsx    ← Main visualizations hub
├── components/
│   ├── VisualizationBuilder.tsx  ← Shared builder (refactored)
│   ├── BarChartVisualization.tsx
│   └── LineChartVisualization.tsx
└── assets/
    ├── barchart.png
    └── linechart.png         ← Add your image here
```

## How It Works

### Refactored VisualizationBuilder Component
The component now accepts optional props:

```typescript
interface VisualizationBuilderProps {
  initialChartType?: 'barchart' | 'linechart';
  showChartTypeToggle?: boolean;
}
```

- **Bar Chart Page** (`/visualizations/bar-chart`):
  - Starts with bar chart selected
  - Toggle hidden
  - User can't switch to line chart
  - Shows only bar chart axes

- **Line Chart Page** (`/visualizations/line-chart`):
  - Starts with line chart selected
  - Toggle hidden
  - User can't switch to bar chart
  - Shows only line chart axes

### Routing
- `/visualizations` - Main hub with both chart cards
- `/visualizations/bar-chart` - Bar chart builder
- `/visualizations/line-chart` - Line chart builder (NEW)

## Features
✅ Separate dedicated pages for each visualization type
✅ Each page shows only relevant axes for that chart type
✅ Chart type toggle available on main hub (when both needed)
✅ Shared VisualizationBuilder component
✅ Time-series support (daily, weekly, monthly binning)
✅ Same metric options as bar chart

