import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAvailableVisualizations, useVisualizationData } from '@/hooks/useVisualization';
import { BarChartVisualization } from './BarChartVisualization';

export function VisualizationBuilder() {
  const [selectedXAxis, setSelectedXAxis] = useState<string | null>(null);
  const [selectedYAxis, setSelectedYAxis] = useState<string | null>(null);

  const { data: availableViz, loading: vizLoading, error: vizError } = useAvailableVisualizations();
  const { data: chartData, loading: chartLoading, error: chartError } = useVisualizationData(
    selectedXAxis,
    selectedYAxis
  );

  if (vizLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (vizError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Error Loading Visualization Options</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{vizError}</p>
        </CardContent>
      </Card>
    );
  }

  const barChartXAxes = availableViz?.x_axis_options || [];
  const barChartYAxes = availableViz?.y_axis_options || [];

  if (!barChartXAxes.length || !barChartYAxes.length) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800">No Visualizations Available</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Card */}
      <Card>
        <CardHeader>
          <CardTitle>Create a Barchart</CardTitle>
          <CardDescription>
            Select a dimension to group by and a metric to visualize
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* X-Axis Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              X-Axis (Group By)
            </label>
            <Select value={selectedXAxis || ''} onValueChange={setSelectedXAxis}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an X-axis variable..." />
              </SelectTrigger>
              <SelectContent>
                {barChartXAxes.map((axis) => (
                  <SelectItem key={axis.id} value={axis.id}>
                    {axis.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedXAxis && barChartXAxes.find(a => a.id === selectedXAxis)?.description}
            </p>
          </div>

          {/* Y-Axis Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Y-Axis (Metric)
            </label>
            <Select value={selectedYAxis || ''} onValueChange={setSelectedYAxis}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Y-axis metric..." />
              </SelectTrigger>
              <SelectContent>
                {barChartYAxes.map((axis) => (
                  <SelectItem key={axis.id} value={axis.id}>
                    {axis.label} ({axis.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedYAxis && barChartYAxes.find(a => a.id === selectedYAxis)?.description}
            </p>
          </div>

          {/* Clear Button */}
          <Button
            variant="outline"
            onClick={() => {
              setSelectedXAxis(null);
              setSelectedYAxis(null);
            }}
            className="w-full"
          >
            Clear Selection
          </Button>
        </CardContent>
      </Card>

      {/* Visualization */}
      {selectedXAxis && selectedYAxis && (
        <BarChartVisualization
          data={chartData}
          loading={chartLoading}
          error={chartError}
        />
      )}

      {/* No Selection Message */}
      {!selectedXAxis || !selectedYAxis ? (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <p className="text-blue-700">
              👆 Select both an X-axis and Y-axis above to generate a visualization
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
