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
import { useAvailableVisualizations, useVisualizationData, useLineChartData } from '@/hooks/useVisualization';
import { BarChartVisualization } from './BarChartVisualization';
import { LineChartVisualization } from './LineChartVisualization';

type VisualizationType = 'barchart' | 'linechart';

interface VisualizationBuilderProps {
  initialChartType?: VisualizationType;
  showChartTypeToggle?: boolean;
}

export function VisualizationBuilder({ 
  initialChartType = 'barchart',
  showChartTypeToggle = true 
}: VisualizationBuilderProps) {
  const [visualizationType, setVisualizationType] = useState<VisualizationType>(initialChartType);
  const [selectedXAxis, setSelectedXAxis] = useState<string | null>(null);
  const [selectedYAxis, setSelectedYAxis] = useState<string | null>(null);

  const { data: availableViz, loading: vizLoading, error: vizError } = useAvailableVisualizations();
  
  // Bar chart data hook
  const { data: barChartData, loading: barChartLoading, error: barChartError } = useVisualizationData(
    visualizationType === 'barchart' ? selectedXAxis : null,
    visualizationType === 'barchart' ? selectedYAxis : null
  );
  
  // Line chart data hook
  const { data: lineChartData, loading: lineChartLoading, error: lineChartError } = useLineChartData(
    visualizationType === 'linechart' ? selectedXAxis : null,
    visualizationType === 'linechart' ? selectedYAxis : null
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
  const lineChartXAxes = availableViz?.linechart_x_axis_options || [];
  const lineChartYAxes = availableViz?.linechart_y_axis_options || [];

  // Validate based on whether we're showing the toggle or a fixed chart type
  const isValidBarChart = barChartXAxes.length > 0 && barChartYAxes.length > 0;
  const isValidLineChart = lineChartXAxes.length > 0 && lineChartYAxes.length > 0;
  
  if (showChartTypeToggle) {
    // When showing toggle, need both types available
    if (!isValidBarChart || !isValidLineChart) {
      return (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">No Visualizations Available</CardTitle>
          </CardHeader>
        </Card>
      );
    }
  } else {
    // When forced to a type, only validate that type
    const isValidCurrent = visualizationType === 'barchart' ? isValidBarChart : isValidLineChart;
    if (!isValidCurrent) {
      return (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">No Visualizations Available</CardTitle>
          </CardHeader>
        </Card>
      );
    }
  }

  // Get appropriate axes based on chart type
  const xAxes = visualizationType === 'barchart' ? barChartXAxes : lineChartXAxes;
  const yAxes = visualizationType === 'barchart' ? barChartYAxes : lineChartYAxes;
  const chartData = visualizationType === 'barchart' ? barChartData : lineChartData;
  const chartLoading = visualizationType === 'barchart' ? barChartLoading : lineChartLoading;
  const chartError = visualizationType === 'barchart' ? barChartError : lineChartError;

  const handleChartTypeChange = (type: VisualizationType) => {
    setVisualizationType(type);
    // Reset selections when changing chart type since the axes are different
    setSelectedXAxis(null);
    setSelectedYAxis(null);
  };

  return (
    <div className="space-y-6">
      {/* Chart Type Selector - Only show if toggle is enabled */}
      {showChartTypeToggle && (
        <Card>
          <CardHeader>
            <CardTitle>Select Visualization Type</CardTitle>
            <CardDescription>
              Choose between bar chart (categorical data) or line chart (time-series data)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                variant={visualizationType === 'barchart' ? 'default' : 'outline'}
                onClick={() => handleChartTypeChange('barchart')}
                className="flex-1"
              >
                Bar Chart
              </Button>
              <Button
                variant={visualizationType === 'linechart' ? 'default' : 'outline'}
                onClick={() => handleChartTypeChange('linechart')}
                className="flex-1"
              >
                Line Chart
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            {visualizationType === 'barchart' ? 'Create a Bar Chart' : 'Create a Line Chart'}
          </CardTitle>
          <CardDescription>
            {visualizationType === 'barchart'
              ? 'Select a dimension to group by and a metric to visualize'
              : 'Select a time period and a metric to visualize'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* X-Axis Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {visualizationType === 'barchart' ? 'X-Axis (Group By)' : 'X-Axis (Time Period)'}
            </label>
            <Select value={selectedXAxis || ''} onValueChange={setSelectedXAxis}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  visualizationType === 'barchart' 
                    ? 'Select an X-axis variable...' 
                    : 'Select a time period...'
                } />
              </SelectTrigger>
              <SelectContent>
                {xAxes.map((axis) => (
                  <SelectItem key={axis.id} value={axis.id}>
                    {axis.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedXAxis && xAxes.find(a => a.id === selectedXAxis)?.description}
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
                {yAxes.map((axis) => (
                  <SelectItem key={axis.id} value={axis.id}>
                    {axis.label} ({axis.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedYAxis && yAxes.find(a => a.id === selectedYAxis)?.description}
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
      {selectedXAxis && selectedYAxis && visualizationType === 'barchart' && (
        <BarChartVisualization
          data={chartData}
          loading={chartLoading}
          error={chartError}
        />
      )}

      {selectedXAxis && selectedYAxis && visualizationType === 'linechart' && (
        <LineChartVisualization
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
              👆 Select both {visualizationType === 'barchart' ? 'a dimension and a metric' : 'a time period and a metric'} above to generate a visualization
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
