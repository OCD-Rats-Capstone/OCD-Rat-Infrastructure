import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { HeatmapVisualizationData } from '@/hooks/useVisualization';

interface HeatmapVisualizationProps {
  data: HeatmapVisualizationData | null;
  loading: boolean;
  error: string | null;
}

// Color gradient: light (low) to dark (high)
function getColorForValue(value: number, minValue: number, maxValue: number): string {
  if (maxValue === minValue) {
    return '#e0f2fe'; // Light blue for uniform values
  }
  
  const normalized = (value - minValue) / (maxValue - minValue);
  
  // Create a gradient from light blue to dark blue
  // Using HSL for better color perception
  const hue = 200; // Blue hue
  const saturation = 60 + normalized * 20; // 60% to 80%
  const lightness = 90 - normalized * 70; // 90% to 20%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function HeatmapVisualization({ data, loading, error }: HeatmapVisualizationProps) {
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Error Loading Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <Card className="w-full border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800">No Data Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-700">No data found for the selected dimensions and metric.</p>
        </CardContent>
      </Card>
    );
  }

  // Build the heatmap matrix
  const xCategories = data.x_categories;
  const yCategories = data.y_categories;
  const minValue = data.min_value;
  const maxValue = data.max_value;

  // Create a map for quick lookup
  const valueMap = new Map<string, number>();
  data.data.forEach((cell) => {
    valueMap.set(`${cell.x}|${cell.y}`, cell.value);
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{data.title}</CardTitle>
        <CardDescription>
          {data.metric} by {data.xlabel} (X-axis) and {data.ylabel} (Y-axis)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Heatmap Grid */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Header with X-axis labels */}
            <div className="flex">
              {/* Corner cell */}
              <div className="w-32 h-12 flex-shrink-0 flex items-center justify-center font-semibold text-xs bg-gray-100 border border-gray-300">
                {data.xlabel}
              </div>
              {/* X-axis category labels */}
              {xCategories.map((cat) => (
                <div
                  key={cat}
                  className="flex-1 min-w-[80px] h-12 flex items-center justify-center font-semibold text-xs bg-gray-50 border border-gray-300 text-center p-2 break-words"
                >
                  {cat}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {yCategories.map((yCategory) => (
              <div key={yCategory} className="flex">
                {/* Y-axis label */}
                <div className="w-32 flex-shrink-0 flex items-center justify-center font-semibold text-xs bg-gray-50 border border-gray-300 p-2 text-center break-words">
                  {yCategory}
                </div>

                {/* Cells */}
                {xCategories.map((xCategory) => {
                  const key = `${xCategory}|${yCategory}`;
                  const value = valueMap.get(key) ?? 0;
                  const cellColor = getColorForValue(value, minValue, maxValue);

                  return (
                    <div
                      key={key}
                      className="flex-1 min-w-[80px] h-16 flex items-center justify-center border border-gray-300 text-sm font-semibold hover:shadow-lg transition-shadow cursor-pointer group relative"
                      style={{ backgroundColor: cellColor }}
                      title={`${xCategory}, ${yCategory}: ${value.toFixed(2)}`}
                    >
                      {value.toFixed(1)}
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {xCategory} × {yCategory}
                        <br />
                        {value.toFixed(2)} {data.unit}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend / Color Scale */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold mb-3">Color Scale</h3>
          <div className="flex items-center gap-3">
            <div
              className="w-64 h-8 rounded border border-gray-300"
              style={{
                background: `linear-gradient(to right, hsl(200, 60%, 90%), hsl(200, 65%, 75%), hsl(200, 70%, 60%), hsl(200, 75%, 45%), hsl(200, 80%, 20%))`,
              }}
            />
            <div className="text-xs text-gray-600 whitespace-nowrap">
              <span className="font-semibold">{minValue.toFixed(1)}</span>
              {' '} to {' '}
              <span className="font-semibold">{maxValue.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-600">Cells</p>
            <p className="text-2xl font-bold">{data.data.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-600">Max Value</p>
            <p className="text-2xl font-bold">{maxValue.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-600">Min Value</p>
            <p className="text-2xl font-bold">{minValue.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-600">Average</p>
            <p className="text-2xl font-bold">
              {(data.data.reduce((sum, cell) => sum + cell.value, 0) / data.data.length).toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
