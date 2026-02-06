import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config';

export interface VisualizationOption {
  id: string;
  label: string;
  aggregation?: string;
}

export interface XAxisOption {
  id: string;
  label: string;
  description: string;
}

export interface YAxisOption {
  id: string;
  label: string;
  description: string;
  unit: string;
}

export interface AvailableVisualizations {
  x_axis_options: XAxisOption[];
  y_axis_options: YAxisOption[];
  linechart_x_axis_options: XAxisOption[];
  linechart_y_axis_options: YAxisOption[];
  heatmap_x_axis_options: XAxisOption[];
  heatmap_y_axis_options: XAxisOption[];
  heatmap_metric_options: YAxisOption[];
  observation_codes?: Array<{ code: string; label: string }>;
}

export interface VisualizationData {
  labels: string[];
  values: number[];
  title: string;
  xlabel: string;
  ylabel: string;
  unit: string;
  raw_data: Record<string, unknown>[];
}

export interface HeatmapCell {
  x: string;
  y: string;
  value: number;
}

export interface HeatmapVisualizationData {
  title: string;
  xlabel: string;
  ylabel: string;
  metric: string;
  unit: string;
  data: HeatmapCell[];
  x_categories: string[];
  y_categories: string[];
  min_value: number;
  max_value: number;
  raw_data: Record<string, unknown>[];
}

/**
 * Hook to fetch available visualization options
 */
export const useAvailableVisualizations = () => {
  const [data, setData] = useState<AvailableVisualizations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true);
        const baseUrl = API_BASE_URL.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/visualizations/available`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch visualization options: ${response.statusText}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, []);

  return { data, loading, error };
};

/**
 * Hook to fetch visualization data based on x_axis and y_axis for bar charts
 */
export const useVisualizationData = (xAxis: string | null, yAxis: string | null) => {
  const [data, setData] = useState<VisualizationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!xAxis || !yAxis) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const baseUrl = API_BASE_URL.replace(/\/$/, '');
        const response = await fetch(
          `${baseUrl}/visualizations/barchart?x_axis=${xAxis}&y_axis=${yAxis}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch visualization data: ${response.statusText}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [xAxis, yAxis]);

  return { data, loading, error };
};

/**
 * Hook to fetch visualization data based on x_axis and y_axis for line charts
 */
export const useLineChartData = (xAxis: string | null, yAxis: string | null) => {
  const [data, setData] = useState<VisualizationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!xAxis || !yAxis) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const baseUrl = API_BASE_URL.replace(/\/$/, '');
        const response = await fetch(
          `${baseUrl}/visualizations/linechart?x_axis=${xAxis}&y_axis=${yAxis}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch visualization data: ${response.statusText}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [xAxis, yAxis]);

  return { data, loading, error };
};

/**
 * Hook to fetch visualization data based on x_axis, y_axis, and metric for heatmaps
 */
export const useHeatmapData = (xAxis: string | null, yAxis: string | null, metric: string | null) => {
  const [data, setData] = useState<HeatmapVisualizationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!xAxis || !yAxis || !metric) {
      setData(null);
      return;
    }

    // Validate that X and Y axes are different
    if (xAxis === yAxis) {
      setError('X-axis and Y-axis must be different dimensions');
      setData(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const baseUrl = API_BASE_URL.replace(/\/$/, '');
        const response = await fetch(
          `${baseUrl}/visualizations/heatmap?x_axis=${xAxis}&y_axis=${yAxis}&metric=${metric}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch heatmap data: ${response.statusText}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [xAxis, yAxis, metric]);

  return { data, loading, error };
};
