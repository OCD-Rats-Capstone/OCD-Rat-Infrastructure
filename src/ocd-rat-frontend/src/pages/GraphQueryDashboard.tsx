import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/config';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ErrorBar,
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
  inj8_sem?: number | string | null;
  inj8_n?: number | string | null;
};

type GraphQueryResponse = {
  query_id: number;
  data: GraphRow[];
};

type GraphPanel = {
  queryId: number;
  payload: GraphQueryResponse | null;
  error: string | null;
};

type SeriesMeta = {
  regimen: string;
  meanKey: string;
  semKey: string;
  nKey: string;
  color: string;
  patternId: string;
  hatched: boolean;
};

type ChartPoint = {
  group: string;
  [key: string]: number | string | null;
};

type LegendEntry = {
  label: string;
  color: string;
  hatched: boolean;
};

const QUERY_IDS = [1, 2, 3, 4, 5] as const;
const TOP_ROW_IDS = [1, 2, 5] as const;
const BOTTOM_ROW_IDS = [3, 4] as const;

const QUERY_TITLES: Record<number, string> = {
  1: 'Frequency of Checking',
  2: 'Length of Check',
  3: 'Recurrence Time of Checking',
  4: 'Stops Before Returning to Check',
  5: 'Duration of Rest',
};

const BAR_COLORS = ['#cbd5e1', '#94a3b8', '#64748b'];

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_');

const toNumberOrNull = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildChartModel = (rows: GraphRow[], panelId: number) => {
  const groups = Array.from(new Set(rows.map((row) => row.brain_status)));
  const regimens = Array.from(new Set(rows.map((row) => row.chronic_regimen)));

  const series: SeriesMeta[] = regimens.map((regimen, index) => {
    const safeRegimen = normalizeKey(regimen);
    return {
      regimen,
      meanKey: `inj8Mean_${safeRegimen}`,
      semKey: `inj8Sem_${safeRegimen}`,
      nKey: `inj8N_${safeRegimen}`,
      color: BAR_COLORS[index % BAR_COLORS.length],
      patternId: `inj8Pattern_${panelId}_${safeRegimen}`,
      hatched: index % 2 === 1,
    };
  });

  const data: ChartPoint[] = groups.map((group) => {
    const point: ChartPoint = { group };

    series.forEach((entry) => {
      const row = rows.find(
        (candidate) => candidate.brain_status === group && candidate.chronic_regimen === entry.regimen
      );
      point[entry.meanKey] = toNumberOrNull(row?.inj8_mean);
      point[entry.semKey] = toNumberOrNull(row?.inj8_sem);
      point[entry.nKey] = toNumberOrNull(row?.inj8_n);
    });

    return point;
  });

  return { data, series };
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
  const panelById = useMemo(() => new Map(panels.map((panel) => [panel.queryId, panel])), [panels]);

  const legendEntries = useMemo(() => {
    const firstPayload = panels.find((panel) => panel.payload)?.payload;
    if (!firstPayload) {
      return [] as LegendEntry[];
    }

    const brainStatuses = Array.from(new Set(firstPayload.data.map((row) => row.brain_status)));
    const regimens = Array.from(new Set(firstPayload.data.map((row) => row.chronic_regimen)));
    const entries: LegendEntry[] = [];

    brainStatuses.forEach((brainStatus, brainIndex) => {
      regimens.forEach((regimen, regimenIndex) => {
        entries.push({
          label: `${brainStatus} + ${regimen}`,
          color: BAR_COLORS[(brainIndex + regimenIndex) % BAR_COLORS.length],
          hatched: regimenIndex % 2 === 1,
        });
      });
    });

    return entries;
  }, [panels]);

  const renderPanel = (queryId: number) => {
    const panel = panelById.get(queryId);

    if (!panel) {
      return (
        <Card key={queryId}>
          <CardHeader>
            <CardTitle>{QUERY_TITLES[queryId]}</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[260px] w-full" />
          </CardContent>
        </Card>
      );
    }

    if (panel.error || !panel.payload) {
      return (
        <Card key={queryId} className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle>{QUERY_TITLES[queryId]}</CardTitle>
            <CardDescription>Unable to load this panel.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-red-800">{panel.error}</CardContent>
        </Card>
      );
    }

    const model = buildChartModel(panel.payload.data, queryId);

    return (
      <Card key={queryId} className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-lg italic">{QUERY_TITLES[queryId]}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={model.data} margin={{ top: 8, right: 12, left: 8, bottom: 40 }}>
              <defs>
                {model.series
                  .filter((series) => series.hatched)
                  .map((series) => (
                    <pattern
                      id={series.patternId}
                      key={series.patternId}
                      patternUnits="userSpaceOnUse"
                      width="8"
                      height="8"
                      patternTransform="rotate(45)"
                    >
                      <rect width="8" height="8" fill={series.color} />
                      <line x1="0" y1="0" x2="0" y2="8" stroke="#ffffff" strokeWidth="2" />
                    </pattern>
                  ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="group" interval={0} height={40} />
              <YAxis />
              <Tooltip
                formatter={(value, name, item) => {
                  const series = model.series.find((entry) => entry.meanKey === name);
                  const semValue = series ? item?.payload?.[series.semKey] : null;
                  const nValue = series ? item?.payload?.[series.nKey] : null;
                  if (typeof value === 'number') {
                    const semPart = typeof semValue === 'number' ? ` ± ${semValue.toFixed(3)} SEM` : '';
                    const nPart = nValue ? ` (n=${nValue})` : '';
                    return [`${value.toFixed(3)}${semPart}${nPart}`, `Inj 8 Mean (${series?.regimen ?? ''})`];
                  }
                  return [String(value), `Inj 8 Mean (${series?.regimen ?? ''})`];
                }}
              />
              {model.series.map((series) => (
                <Bar
                  key={series.meanKey}
                  dataKey={series.meanKey}
                  fill={series.hatched ? `url(#${series.patternId})` : series.color}
                  stroke="#4b5563"
                  radius={[3, 3, 0, 0]}
                >
                  <ErrorBar dataKey={series.semKey} width={7} strokeWidth={2} stroke="#1f2937" />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10">
      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Compulsive Checking Criteria Dashboard</h1>
        <p className="mt-3 max-w-3xl text-base text-gray-600">
          This dashboard applies the M. C. Tucci et al. Figure 4 method to calculate performance on criteria measures for
          compulsive checking behavior. Panels are generated from five fixed toolbox graph queries using Inj 8 values and SEM
          whiskers.
        </p>
      </div>

      <Separator className="mb-8" />

      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {QUERY_IDS.map((id) => (
            <Card key={id}>
              <CardHeader>
                <Skeleton className="h-6 w-64" />
                <Skeleton className="mt-2 h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[260px] w-full" />
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[260px] w-full" />
            </CardContent>
          </Card>
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

          <div className="rounded-xl border bg-slate-50 p-6">
            <div className="mb-6 grid grid-cols-1 gap-3 text-center lg:grid-cols-3">
              <div className="rounded-md bg-white p-3 text-sm font-semibold uppercase tracking-wide text-slate-600 lg:col-span-2">
                Criteria of compulsive checking behavior
              </div>
              <div className="rounded-md bg-white p-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Measure of satiety
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {TOP_ROW_IDS.map((queryId) => renderPanel(queryId))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {BOTTOM_ROW_IDS.map((queryId) => renderPanel(queryId))}

              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-center text-lg">Legend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {legendEntries.map((entry) => (
                    <div key={entry.label} className="flex items-center gap-3 text-sm text-slate-700">
                      <span
                        className="inline-block h-5 w-5 border border-slate-500"
                        style={{
                          backgroundColor: entry.color,
                          backgroundImage: entry.hatched
                            ? 'repeating-linear-gradient(45deg, transparent 0, transparent 4px, rgba(255,255,255,0.95) 4px, rgba(255,255,255,0.95) 6px)'
                            : 'none',
                        }}
                      />
                      <span>{entry.label}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
