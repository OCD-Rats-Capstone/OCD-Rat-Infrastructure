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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

type HeaderBlock = {
  text: string;
  colSpan?: number;
};

type LayoutCell =
  | { type: 'query'; queryId: number; colSpan?: number }
  | { type: 'legend'; colSpan?: number }
  | { type: 'spacer'; colSpan?: number };

type DashboardSetConfig = {
  id: string;
  label: string;
  dashboardTitle: string;
  dashboardDescription: string;
  columns: 2 | 3 | 4;
  headerBlocks?: HeaderBlock[];
  layoutRows: LayoutCell[][];
  queryTitles: Record<number, string>;
};

const DASHBOARD_SETS: DashboardSetConfig[] = [
  {
    id: 'tucci-figure-4-criteria',
    label: 'Set 1: Tucci Figure 4 Criteria',
    dashboardTitle: 'Compulsive Checking Criteria Dashboard',
    dashboardDescription:
      'Applies the M. C. Tucci et al. Figure 4 method to calculate performance on criteria measures for compulsive checking behavior. Panels are generated from five fixed toolbox graph queries using Inj 8 values and SEM whiskers.',
    columns: 3,
    headerBlocks: [
      { text: 'Criteria of compulsive checking behavior', colSpan: 2 },
      { text: 'Measure of satiety', colSpan: 1 },
    ],
    layoutRows: [
      [
        { type: 'query', queryId: 1 },
        { type: 'query', queryId: 2 },
        { type: 'query', queryId: 5 },
      ],
      [
        { type: 'query', queryId: 3 },
        { type: 'query', queryId: 4 },
        { type: 'legend' },
      ],
    ],
    queryTitles: {
      1: 'Frequency of Checking',
      2: 'Length of Check',
      3: 'Recurrence Time of Checking',
      4: 'Stops Before Returning to Check',
      5: 'Duration of Rest',
    },
  },
];

const BAR_COLORS = ['#cbd5e1', '#94a3b8', '#64748b'];

const getGridColumnsClass = (columns: 2 | 3 | 4) => {
  if (columns === 2) {
    return 'lg:grid-cols-2';
  }
  if (columns === 4) {
    return 'lg:grid-cols-4';
  }
  return 'lg:grid-cols-3';
};

const getLgColSpanClass = (colSpan: number) => {
  if (colSpan <= 1) {
    return 'lg:col-span-1';
  }
  if (colSpan === 2) {
    return 'lg:col-span-2';
  }
  if (colSpan === 3) {
    return 'lg:col-span-3';
  }
  return 'lg:col-span-4';
};

const getSetQueryIds = (layoutRows: LayoutCell[][]) => {
  const queryIds = layoutRows.flatMap((row) =>
    row.flatMap((cell) => (cell.type === 'query' ? [cell.queryId] : []))
  );
  return Array.from(new Set(queryIds));
};

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_');

const toNumberOrNull = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const roundUpNice = (value: number) => {
  if (value <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;

  if (normalized <= 1) {
    return magnitude;
  }
  if (normalized <= 2) {
    return 2 * magnitude;
  }
  if (normalized <= 5) {
    return 5 * magnitude;
  }

  return 10 * magnitude;
};

const roundDownNice = (value: number) => {
  if (value <= 0) {
    return 0;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;

  if (normalized >= 5) {
    return 5 * magnitude;
  }
  if (normalized >= 2) {
    return 2 * magnitude;
  }
  if (normalized >= 1) {
    return magnitude;
  }

  return 0;
};

const getYAxisDomain = (data: ChartPoint[], series: SeriesMeta[]): [number, number] => {
  const values = data.flatMap((point) =>
    series.flatMap((entry) => {
      const mean = point[entry.meanKey];
      const sem = point[entry.semKey];

      if (typeof mean !== 'number') {
        return [] as number[];
      }

      const semValue = typeof sem === 'number' ? sem : 0;
      return [Math.max(0, mean - semValue), mean + semValue];
    })
  );

  if (values.length === 0) {
    return [0, 1];
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(maxValue - minValue, maxValue * 0.2, 0.25);
  const topPadding = range * 0.18;
  const bottomPadding = range * 0.08;

  const lower = roundDownNice(Math.max(0, minValue - bottomPadding));
  const upper = roundUpNice(maxValue + topPadding);

  return upper > lower ? [lower, upper] : [0, roundUpNice(maxValue + 1)];
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

  return {
    data,
    series,
    yDomain: getYAxisDomain(data, series),
  };
};

export function GraphQueryDashboard() {
  const [selectedSetId, setSelectedSetId] = useState(DASHBOARD_SETS[0].id);
  const [loading, setLoading] = useState(true);
  const [panels, setPanels] = useState<GraphPanel[]>([]);

  const selectedSet = useMemo(
    () => DASHBOARD_SETS.find((setConfig) => setConfig.id === selectedSetId) ?? DASHBOARD_SETS[0],
    [selectedSetId]
  );
  const selectedSetQueryIds = useMemo(() => getSetQueryIds(selectedSet.layoutRows), [selectedSet]);

  const queryTitle = (queryId: number) => selectedSet.queryTitles[queryId] ?? `Query ${queryId}`;

  useEffect(() => {
    const fetchAllPanels = async () => {
      setLoading(true);
      setPanels([]);
      const baseUrl = API_BASE_URL.replace(/\/$/, '');

      const results = await Promise.all(
        selectedSetQueryIds.map(async (queryId): Promise<GraphPanel> => {
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
  }, [selectedSet, selectedSetQueryIds]);

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
            <CardTitle>{queryTitle(queryId)}</CardTitle>
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
            <CardTitle>{queryTitle(queryId)}</CardTitle>
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
          <CardTitle className="text-center text-lg italic">{queryTitle(queryId)}</CardTitle>
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
              <YAxis domain={model.yDomain} tickCount={5} />
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

  const renderLegendCard = (key: string) => (
    <Card key={key} className="h-full">
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
  );

  const renderLayoutCell = (cell: LayoutCell, cellKey: string) => {
    const colSpanClass = getLgColSpanClass(cell.colSpan ?? 1);

    if (cell.type === 'query') {
      return (
        <div key={cellKey} className={colSpanClass}>
          {renderPanel(cell.queryId)}
        </div>
      );
    }

    if (cell.type === 'legend') {
      return <div key={cellKey} className={colSpanClass}>{renderLegendCard(cellKey)}</div>;
    }

    return <div key={cellKey} className={`hidden ${colSpanClass} lg:block`} />;
  };

  const renderLoadingCell = (cell: LayoutCell, cellKey: string) => {
    const colSpanClass = getLgColSpanClass(cell.colSpan ?? 1);

    if (cell.type === 'spacer') {
      return <div key={cellKey} className={`hidden ${colSpanClass} lg:block`} />;
    }

    return (
      <div key={cellKey} className={colSpanClass}>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-2 h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[260px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10">
      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">{selectedSet.dashboardTitle}</h1>
        <p className="mt-3 max-w-3xl text-base text-gray-600">{selectedSet.dashboardDescription}</p>

        <div className="mt-5 max-w-sm">
          <p className="mb-2 text-sm font-medium text-gray-700">Graph Set</p>
          <Select value={selectedSetId} onValueChange={setSelectedSetId}>
            <SelectTrigger>
              <SelectValue placeholder="Select graph set" />
            </SelectTrigger>
            <SelectContent>
              {DASHBOARD_SETS.map((setConfig) => (
                <SelectItem key={setConfig.id} value={setConfig.id}>
                  {setConfig.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="mb-8" />

      {loading ? (
        <div className="space-y-6">
          {selectedSet.layoutRows.map((row, rowIndex) => (
            <div
              key={`loading-row-${rowIndex}`}
              className={`grid grid-cols-1 gap-6 ${getGridColumnsClass(selectedSet.columns)}`}
            >
              {row.map((cell, cellIndex) => renderLoadingCell(cell, `loading-${rowIndex}-${cellIndex}`))}
            </div>
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

          <div className="rounded-xl border bg-slate-50 p-6">
            {selectedSet.headerBlocks && selectedSet.headerBlocks.length > 0 && (
              <div className={`mb-6 grid grid-cols-1 gap-3 text-center ${getGridColumnsClass(selectedSet.columns)}`}>
                {selectedSet.headerBlocks.map((headerBlock, index) => (
                  <div
                    key={`header-block-${index}`}
                    className={`rounded-md bg-white p-3 text-sm font-semibold uppercase tracking-wide text-slate-600 ${getLgColSpanClass(
                      headerBlock.colSpan ?? 1
                    )}`}
                  >
                    {headerBlock.text}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-6">
              {selectedSet.layoutRows.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`} className={`grid grid-cols-1 gap-6 ${getGridColumnsClass(selectedSet.columns)}`}>
                  {row.map((cell, cellIndex) => renderLayoutCell(cell, `row-${rowIndex}-cell-${cellIndex}`))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
