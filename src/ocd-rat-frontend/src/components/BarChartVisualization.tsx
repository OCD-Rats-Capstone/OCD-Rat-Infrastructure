import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { VisualizationData } from '@/hooks/useVisualization';

interface BarChartVisualizationProps {
  data: VisualizationData | null;
  loading: boolean;
  error: string | null;
}

export function BarChartVisualization({ data, loading, error }: BarChartVisualizationProps) {
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
          <CardTitle className="text-red-800">Error Loading Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.labels.length === 0) {
    return (
      <Card className="w-full border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800">No Data Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-700">No data found for the selected dimension and metric.</p>
        </CardContent>
      </Card>
    );
  }

  // Transform data for Recharts
  const chartData = data.labels.map((label, index) => ({
    name: label,
    value: data.values[index],
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{data.title}</CardTitle>
        <CardDescription>
          {data.ylabel} grouped by {data.xlabel}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={100}
            />
            <YAxis label={{ value: data.ylabel, angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value) => {
                if (typeof value === 'number') {
                  return value.toFixed(2);
                }
                return String(value);
              }}
            />
            <Legend />
            <Bar dataKey="value" fill="#3b82f6" name={data.ylabel} />
          </BarChart>
        </ResponsiveContainer>

        {/* Summary Statistics */}
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-600">Count</p>
            <p className="text-2xl font-bold">{data.labels.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-600">Max</p>
            <p className="text-2xl font-bold">{Math.max(...data.values).toFixed(2)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-600">Min</p>
            <p className="text-2xl font-bold">{Math.min(...data.values).toFixed(2)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-600">Average</p>
            <p className="text-2xl font-bold">
              {(data.values.reduce((a, b) => a + b, 0) / data.values.length).toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
