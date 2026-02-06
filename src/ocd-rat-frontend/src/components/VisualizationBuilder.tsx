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
import { useAvailableVisualizations, useVisualizationData, useLineChartData, useHeatmapData } from '@/hooks/useVisualization';
import { BarChartVisualization } from './BarChartVisualization';
import { LineChartVisualization } from './LineChartVisualization';
import { HeatmapVisualization } from './HeatmapVisualization';

type VisualizationType = 'barchart' | 'linechart' | 'heatmap';

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
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

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

  // Heatmap data hook
  const { data: heatmapData, loading: heatmapLoading, error: heatmapError } = useHeatmapData(
    visualizationType === 'heatmap' ? selectedXAxis : null,
    visualizationType === 'heatmap' ? selectedYAxis : null,
    visualizationType === 'heatmap' ? selectedMetric : null
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
  const heatmapXAxes = availableViz?.heatmap_x_axis_options || [];
  const heatmapYAxes = availableViz?.heatmap_y_axis_options || [];
  const heatmapMetrics = availableViz?.heatmap_metric_options || [];

  // Validate based on whether we're showing the toggle or a fixed chart type
  const isValidBarChart = barChartXAxes.length > 0 && barChartYAxes.length > 0;
  const isValidLineChart = lineChartXAxes.length > 0 && lineChartYAxes.length > 0;
  const isValidHeatmap = heatmapXAxes.length > 0 && heatmapYAxes.length > 0 && heatmapMetrics.length > 0;
  
  if (showChartTypeToggle) {
    // When showing toggle, need all types available
    if (!isValidBarChart || !isValidLineChart || !isValidHeatmap) {
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
    const isValidCurrent = 
      visualizationType === 'barchart' ? isValidBarChart : 
      visualizationType === 'linechart' ? isValidLineChart :
      isValidHeatmap;
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
  const xAxes = visualizationType === 'barchart' ? barChartXAxes : 
               visualizationType === 'linechart' ? lineChartXAxes :
               heatmapXAxes;
  const yAxes = visualizationType === 'barchart' ? barChartYAxes : 
               visualizationType === 'linechart' ? lineChartYAxes :
               heatmapYAxes;
  const metrics = visualizationType === 'heatmap' ? heatmapMetrics : [];
  const chartData = visualizationType === 'barchart' ? barChartData : 
                   visualizationType === 'linechart' ? lineChartData :
                   heatmapData;
  const chartLoading = visualizationType === 'barchart' ? barChartLoading : 
                      visualizationType === 'linechart' ? lineChartLoading :
                      heatmapLoading;
  const chartError = visualizationType === 'barchart' ? barChartError : 
                    visualizationType === 'linechart' ? lineChartError :
                    heatmapError;

  const handleChartTypeChange = (type: VisualizationType) => {
    setVisualizationType(type);
    // Reset selections when changing chart type since the axes are different
    setSelectedXAxis(null);
    setSelectedYAxis(null);
    setSelectedMetric(null);
  };

  return (
    <div className="space-y-6">
      {/* Chart Type Selector - Only show if toggle is enabled */}
      {showChartTypeToggle && (
        <Card>
          <CardHeader>
            <CardTitle>Select Visualization Type</CardTitle>
            <CardDescription>
              Choose between bar chart (categorical), line chart (time-series), or heatmap (2D patterns)
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
              <Button
                variant={visualizationType === 'heatmap' ? 'default' : 'outline'}
                onClick={() => handleChartTypeChange('heatmap')}
                className="flex-1"
              >
                Heatmap
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            {visualizationType === 'barchart' ? 'Create a Bar Chart' : 
             visualizationType === 'linechart' ? 'Create a Line Chart' :
             'Create a Heatmap'}
          </CardTitle>
          <CardDescription>
            {visualizationType === 'barchart'
              ? 'Select a dimension to group by and a metric to visualize'
              : visualizationType === 'linechart'
              ? 'Select a time period and a metric to visualize'
              : 'Select two different dimensions and a metric to visualize patterns'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* X-Axis Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {visualizationType === 'barchart' ? 'X-Axis (Group By)' : 
               visualizationType === 'linechart' ? 'X-Axis (Time Period)' :
               'X-Axis (First Dimension)'}
            </label>
            <Select value={selectedXAxis || ''} onValueChange={setSelectedXAxis}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  visualizationType === 'barchart' 
                    ? 'Select an X-axis variable...' 
                    : visualizationType === 'linechart'
                    ? 'Select a time period...'
                    : 'Select the X-axis dimension...'
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
              {visualizationType === 'heatmap' ? 'Y-Axis (Second Dimension)' : 'Y-Axis (Metric)'}
            </label>
            <Select value={selectedYAxis || ''} onValueChange={setSelectedYAxis}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  visualizationType === 'heatmap'
                    ? 'Select the Y-axis dimension...'
                    : 'Select a Y-axis metric...'
                } />
              </SelectTrigger>
              <SelectContent>
                {yAxes.map((axis) => (
                  <SelectItem key={axis.id} value={axis.id}>
                    {axis.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedYAxis && yAxes.find(a => a.id === selectedYAxis)?.description}
            </p>
            {visualizationType === 'heatmap' && selectedXAxis && selectedYAxis && selectedXAxis === selectedYAxis && (
              <p className="text-xs text-red-600 mt-1">
                ⚠️ X-axis and Y-axis must be different dimensions
              </p>
            )}
          </div>

          {/* Metric Selector - Only for Heatmap */}
          {visualizationType === 'heatmap' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cell Value (Metric)
              </label>
              <Select value={selectedMetric || ''} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a metric..." />
                </SelectTrigger>
                <SelectContent>
                  {metrics.map((metric) => (
                    <SelectItem key={metric.id} value={metric.id}>
                      {metric.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {selectedMetric && metrics.find(m => m.id === selectedMetric)?.description}
              </p>
            </div>
          )}

          {/* Clear Button */}
          <Button
            variant="outline"
            onClick={() => {
              setSelectedXAxis(null);
              setSelectedYAxis(null);
              setSelectedMetric(null);
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
          data={barChartData}
          loading={barChartLoading}
          error={barChartError}
        />
      )}

      {selectedXAxis && selectedYAxis && visualizationType === 'linechart' && (
        <LineChartVisualization
          data={lineChartData}
          loading={lineChartLoading}
          error={lineChartError}
        />
      )}

      {selectedXAxis && selectedYAxis && selectedMetric && visualizationType === 'heatmap' && selectedXAxis !== selectedYAxis && (
        <HeatmapVisualization
          data={heatmapData}
          loading={heatmapLoading}
          error={heatmapError}
        />
      )}

      {/* No Selection Message */}
      {!selectedXAxis || !selectedYAxis || (visualizationType === 'heatmap' && !selectedMetric) ? (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <p className="text-blue-700">
              Select {
                visualizationType === 'barchart' ? 'a dimension and a metric' : 
                visualizationType === 'linechart' ? 'a time period and a metric' :
                'two different dimensions and a metric'
              } above to generate a visualization
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Validation Error for Heatmap Same Axis */}
      {visualizationType === 'heatmap' && selectedXAxis && selectedYAxis && selectedXAxis === selectedYAxis && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">
              X-axis and Y-axis must be different dimensions for a heatmap
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
