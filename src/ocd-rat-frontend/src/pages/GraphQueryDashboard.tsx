import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/config';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

type GraphRow = {
  brain_status: string;
  chronic_regimen: string;
  inj8_mean: number | string | null;
  inj10_mean: number | string | null;
  inj8_n?: number | string | null;
  inj10_n?: number | string | null;
};

type GraphQueryResponse = {
  query_id: number;
  slug: string;
  title: string;
  description: string;
  data: GraphRow[];
};

type GraphPanel = {
  queryId: number;
  payload: GraphQueryResponse | null;
  error: string | null;
};

const QUERY_IDS = [1, 2, 3, 4, 5] as const;

const toNumberOrNull = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function GraphQueryDashboard() {
  const [loading, setLoading] = useState(true);
  const [panels, setPanels] = useState<GraphPanel[]>([]);

  useEffect(() => {
    const fetchAllPanels = async () => {
      setLoading(true);
      const baseUrl = API_BASE_URL.replace(/\/$/, '');

      const results = await Promise.all(
        QUERY_IDS.map(async (queryId): Promise<GraphPanel> => {
          try {
            const response = await fetch(`${baseUrl}/toolbox/graph-query/${queryId}/`);
            const payload = await response.json();

            if (!response.ok) {
              const detail = payload?.detail || `HTTP ${response.status}`;
              return { queryId, payload: null, error: String(detail) };
            }

            return { queryId, payload, error: null };
          } catch (error) {
            return {
              queryId,
              payload: null,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );

      setPanels(results);
      setLoading(false);
    };

    fetchAllPanels();
  }, []);

  const hasAnyError = useMemo(() => panels.some((panel) => panel.error), [panels]);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10">
      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Behavior Graph Dashboard</h1>
        <p className="mt-3 max-w-3xl text-base text-gray-600">
          Five fixed bar-chart views powered by the graph-query toolbox API. Each panel compares Inj 8 and Inj 10 means across
          brain status and chronic regimen groups.
        </p>
      </div>

      <Separator className="mb-8" />

      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {QUERY_IDS.map((id) => (
            <Card key={id}>
              <CardHeader>
                <Skeleton className="h-6 w-64" />
                <Skeleton className="mt-2 h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[320px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {hasAnyError && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="pt-6 text-sm text-amber-900">
                One or more panels failed to load. Successful panels are still shown below.
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {panels.map((panel) => {
              if (panel.error || !panel.payload) {
                return (
                  <Card key={panel.queryId} className="border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle>Query {panel.queryId}</CardTitle>
                      <CardDescription>Unable to load this panel.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-red-800">{panel.error}</CardContent>
                  </Card>
                );
              }

              const chartData = panel.payload.data.map((row) => ({
                group: `${row.brain_status} | ${row.chronic_regimen}`,
                inj8Mean: toNumberOrNull(row.inj8_mean),
                inj10Mean: toNumberOrNull(row.inj10_mean),
                inj8N: toNumberOrNull(row.inj8_n),
                inj10N: toNumberOrNull(row.inj10_n),
              }));

              return (
                <Card key={panel.payload.query_id}>
                  <CardHeader>
                    <CardTitle>
                      Q{panel.payload.query_id}: {panel.payload.title}
                    </CardTitle>
                    <CardDescription>{panel.payload.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={chartData} margin={{ top: 16, right: 20, left: 8, bottom: 72 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="group" angle={-25} textAnchor="end" interval={0} height={74} />
                        <YAxis />
                        <Tooltip
                          formatter={(value, name, item) => {
                            const label = name === 'inj8Mean' ? 'Inj 8 Mean' : 'Inj 10 Mean';
                            const nKey = name === 'inj8Mean' ? 'inj8N' : 'inj10N';
                            const nValue = item?.payload?.[nKey];
                            if (typeof value === 'number') {
                              return [`${value.toFixed(3)}${nValue ? ` (n=${nValue})` : ''}`, label];
                            }
                            return [String(value), label];
                          }}
                        />
                        <Legend
                          formatter={(value) => (value === 'inj8Mean' ? 'Inj 8 Mean' : 'Inj 10 Mean')}
                        />
                        <Bar dataKey="inj8Mean" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="inj10Mean" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
