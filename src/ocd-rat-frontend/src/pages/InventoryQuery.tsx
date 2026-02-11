import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Info } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import {
  Popup,
  PopupTrigger,
  PopupContent,
  PopupHeader,
  PopupFooter,
  PopupTitle,
  PopupDescription
} from '@/components/FilePopout';

export interface FilterOptions {
  drugs?: { id: number; label: string }[];
  apparatuses?: { id: number; label: string }[];
  apparatus_patterns?: { id: number; label: string }[];
  session_types?: { id: number; label: string }[];
  surgery_types?: { label: string }[];
  brain_regions?: { id: number; label: string }[];
  testing_rooms?: { id: number; label: string }[];
  file_types?: {id: number; label: string}[];
  rx?: {id: number; label: string}[];
}

export interface DataTypeCount {
  object_type_id: number;
  object_type_name: string;
  file_count: number;
  session_count: number;
}

export interface InventoryCountsResponse {
  total_sessions: number;
  counts_by_type: DataTypeCount[];
}

export interface InventoryFilters {
  drug_ids: number[];
  apparatus_id: number | null;
  pattern_id: number | null;
  session_type_id: number | null;
  surgery_type: string | null;
  target_region_id: number | null;
  room_id: number | null;
}

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4'];

export function Inventory() {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({
    drug_ids: [],
    apparatus_id: null,
    pattern_id: null,
    session_type_id: null,
    surgery_type: null,
    target_region_id: null,
    room_id: null,
  });
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InventoryCountsResponse | null>(null);
  const [sessions, setSessions] = useState<Record<string, unknown>[] | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedDrugIds, setSelectedDrugIds] = useState<Set<number>>(new Set());
  const [selectedFileTypeIds, setSelectedFileTypeIds] = useState<Set<number>>(new Set());
  const [selectedRXIds, setSelectedRXIds] = useState<Set<number>>(new Set());
  const [CsvChecked, SetCsvChecked] = useState(false);
  const [MpgChecked, SetMpgChecked] = useState(false);
  const [GifChecked, SetGifChecked] = useState(false);
  const [EwbChecked, SetEwbChecked] = useState(false);
  const [JpgChecked, SetJpgChecked] = useState(false);
  const [FilesComplete, SetFilesComplete] = useState(0);
  const [Progress, SetProgress] = useState(0);
  const [TotalFiles, SetTotalFiles] = useState(0);
  const [open, setOpen] = useState(false);
  const [DownloadVisible, SetDownloadVisible] = useState(false);
  const togglePopup = () => setOpen((prev) => !prev);

  useEffect(() => {
    const base = API_BASE_URL.replace(/\/$/, '');
    fetch(`${base}/inventory/filter-options`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data) => {
        setFilterOptions(data);
      })
      .catch(() => setFilterOptions(null))
      .finally(() => setOptionsLoading(false));
  }, []);

  const applyPreset = (preset: 'all' | 'unoperated') => {
    const base = API_BASE_URL.replace(/\/$/, '');
    setLoading(true);
    setError(null);
    const body = preset === 'all' ? {} : { surgery_type: 'Unoperated' };
    if (preset === 'all') {
      setSelectedDrugIds(new Set());
      setFilters({
        drug_ids: [],
        apparatus_id: null,
        pattern_id: null,
        session_type_id: null,
        surgery_type: null,
        target_region_id: null,
        room_id: null,
      });
    } else {
      setSelectedDrugIds(new Set());
      setFilters({
        drug_ids: [],
        apparatus_id: null,
        pattern_id: null,
        session_type_id: null,
        surgery_type: 'Unoperated',
        target_region_id: null,
        room_id: null,
      });
    }
    fetch(`${base}/inventory/counts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (res.ok) return res.json() as Promise<InventoryCountsResponse>;
        const err = await res.json().catch(() => ({})) as { detail?: string; error?: string };
        throw new Error(err.detail || err.error || res.statusText);
      })
      .then((data) => setResult(data))
      .catch((e) => setError(e?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  const buildRequestBody = () => {
    const body: Record<string, unknown> = {};
    if (selectedDrugIds.size > 0) body.drug_ids = Array.from(selectedDrugIds);
    if (selectedFileTypeIds.size > 0) body.file_type_ids = Array.from(selectedFileTypeIds);
    if (selectedRXIds.size > 0) body.rx_ids = Array.from(selectedRXIds);
    if (filters.apparatus_id != null) body.apparatus_id = filters.apparatus_id;
    if (filters.pattern_id != null) body.pattern_id = filters.pattern_id;
    if (filters.session_type_id != null) body.session_type_id = filters.session_type_id;
    if (filters.surgery_type != null && filters.surgery_type !== '') body.surgery_type = filters.surgery_type;
    if (filters.target_region_id != null) body.target_region_id = filters.target_region_id;
    if (filters.room_id != null) body.room_id = filters.room_id;
    return body;
  };

  const handleApply = async () => {
    setLoading(true);
    setError(null);
    const base = API_BASE_URL.replace(/\/$/, '');
    try {
      const res = await fetch(`${base}/inventory/counts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || res.statusText);
      }
      const data: InventoryCountsResponse = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inventory');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedDrugIds(new Set());
    setFilters({
      drug_ids: [],
      apparatus_id: null,
      pattern_id: null,
      session_type_id: null,
      surgery_type: null,
      target_region_id: null,
      room_id: null,
    });
    setResult(null);
    setSessions(null);
    setError(null);
  };

  const handleViewSessions = async () => {
    setSessionsLoading(true);
    setSessions(null);
    const base = API_BASE_URL.replace(/\/$/, '');
    try {
      const res = await fetch(`${base}/inventory/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(err.detail || res.statusText);
      }
      const data = await res.json() as Record<string, unknown>[];
      setSessions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const toggleDrug = (id: number) => {
    setSelectedDrugIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

    const toggleFileType = (id: number) => {
    setSelectedFileTypeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRX = (id: number) => {
    setSelectedRXIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const chartData = result?.counts_by_type?.map((c) => ({
    name: c.object_type_name,
    files: c.file_count,
    sessions: c.session_count,
  })) ?? [];

  const fetchData = async (Usertext: string) => {
    try {
      const params = {
        query_type: 'NLP',
        text: Usertext
      };
      const query = new URLSearchParams(params).toString();
      // Ensure proper URL construction handling potential relative paths
      const baseUrl = API_BASE_URL.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/nlp/?${query}`);
      const data = await response.json();

      // New API returns { rationale, sql, results }
      return data;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }

  const fetchFiles = async (Csv: string, Ewb: string, Jpg: string, Mpg: string, Gif: string) => {
    try {

      const id = String(crypto.randomUUID());
      SetDownloadVisible(true);

      const params = {
        query_type: "FILTER",
        Csv_Flag: Csv,
        Ewb_Flag: Ewb,
        Gif_Flag: Gif,
        Jpg_Flag: Jpg,
        Mpg_Flag: Mpg,
        job_id: id
      };

      const status_params = {
        job_id: id
      };

      const baseUrl = (API_BASE_URL.replace(/\/$/, ''));
      const searchParams = new URLSearchParams(params).toString();
      const status_searchParams = new URLSearchParams(params).toString();
      const url = `${baseUrl}/files/?${searchParams}`;
      const serve_url = `${baseUrl}/files/serve/?${status_searchParams}`;

      const response = await fetch(url);
      const resData = await response.json();

      while(true){

        const statusRes = await fetch(`${baseUrl}/files/status/?${status_searchParams}`);
        const data = await statusRes.json();
        console.log(data);
        if (data["status"] == "ready") break;
        SetTotalFiles(data["num_files"]);
        SetFilesComplete(data["completed"]);
        SetProgress(Math.round(100*parseFloat(String(data["completed"]))/parseFloat(String(data["num_files"]))))
        await new Promise(r => setTimeout(r, 2500));
      }

      const a = document.createElement("a");
      a.href = serve_url;
      const file_name = "FRDR_FILES_" + id + ".zip";
      a.download = file_name;
      document.body.appendChild(a);
      a.click();

      a.remove();

      SetDownloadVisible(false);

    } catch (error) {
      console.error("Error fetching data:", error);
      SetDownloadVisible(false);
      throw error;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-3xl font-bold tracking-tight text-center mb-2">
          Data Inventory
        </h1>
        <p className="text-muted-foreground text-center mb-6">
          Counts by raw data type (video, track files, etc.). Use filters to narrow sessions.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => applyPreset('all')} disabled={loading}>
            Show full inventory
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset('unoperated')} disabled={loading}>
            Unoperated rats only
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left sidebar - Amazon-style filters */}
          <aside className="w-full lg:w-72 shrink-0">
            <Card className="p-4">
              <h2 className="font-semibold mb-3">Filters</h2>
              {optionsLoading ? (
                <p className="text-sm text-muted-foreground">Loading options…</p>
              ) : (
                <ScrollArea className="h-[60vh] pr-2">
                  <Accordion type="multiple" className="w-full" defaultValue={['drugs', 'brain', 'apparatus', 'session']}>
                    <AccordionItem value="drugs">
                      <AccordionTrigger>Drug treatment</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-xs text-muted-foreground mb-2">Select one or more for combination.</p>
                        <div className="space-y-2">
                          {filterOptions?.drugs?.map((d) => (
                            <div key={d.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`drug-${d.id}`}
                                checked={selectedDrugIds.has(d.id)}
                                onCheckedChange={() => toggleDrug(d.id)}
                              />
                              <label htmlFor={`drug-${d.id}`} className="text-sm cursor-pointer truncate" title={d.label}>
                                {d.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="files">
                      <AccordionTrigger>File Types</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-xs text-muted-foreground mb-2">Select one or more for combination.</p>
                        <div className="space-y-2">
                          {filterOptions?.file_types?.map((d) => (
                            <div key={d.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`object_type-${d.id}`}
                                checked={selectedFileTypeIds.has(d.id)}
                                onCheckedChange={() => toggleFileType(d.id)}
                              />
                              <label htmlFor={`object_type-${d.id}`} className="text-sm cursor-pointer truncate" title={d.label}>
                                {d.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="files">
                      <AccordionTrigger>Drug Regiments</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-xs text-muted-foreground mb-2">Select Highly Granular Drug Regiments</p>
                        <div className="space-y-2">
                          {filterOptions?.rx?.map((d) => (
                            <div key={d.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`drug_rx-${d.id}`}
                                checked={selectedRXIds.has(d.id)}
                                onCheckedChange={() => toggleRX(d.id)}
                              />
                              <label htmlFor={`drug_rx-${d.id}`} className="text-sm cursor-pointer truncate" title={d.label}>
                                {d.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="brain">
                      <AccordionTrigger>Brain manipulation</AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">Surgery type</label>
                          <Select
                            value={filters.surgery_type ?? 'null'}
                            onValueChange={(v) => setFilters((f) => ({ ...f, surgery_type: v === 'null' ? null : v }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="null">Any</SelectItem>
                              {filterOptions?.surgery_types?.map((s) => (
                                <SelectItem key={s.label} value={s.label}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Brain region</label>
                          <Select
                            value={filters.target_region_id != null ? String(filters.target_region_id) : 'null'}
                            onValueChange={(v) => setFilters((f) => ({ ...f, target_region_id: v === 'null' ? null : parseInt(v, 10) }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="null">Any</SelectItem>
                              {filterOptions?.brain_regions?.map((r) => (
                                <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="apparatus">
                      <AccordionTrigger>Apparatus</AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">Apparatus</label>
                          <Select
                            value={filters.apparatus_id != null ? String(filters.apparatus_id) : 'null'}
                            onValueChange={(v) => setFilters((f) => ({ ...f, apparatus_id: v === 'null' ? null : parseInt(v, 10) }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="null">Any</SelectItem>
                              {filterOptions?.apparatuses?.map((a) => (
                                <SelectItem key={a.id} value={String(a.id)}>{a.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Pattern</label>
                          <Select
                            value={filters.pattern_id != null ? String(filters.pattern_id) : 'null'}
                            onValueChange={(v) => setFilters((f) => ({ ...f, pattern_id: v === 'null' ? null : parseInt(v, 10) }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="null">Any</SelectItem>
                              {filterOptions?.apparatus_patterns?.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>{p.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Room</label>
                          <Select
                            value={filters.room_id != null ? String(filters.room_id) : 'null'}
                            onValueChange={(v) => setFilters((f) => ({ ...f, room_id: v === 'null' ? null : parseInt(v, 10) }))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="null">Any</SelectItem>
                              {filterOptions?.testing_rooms?.map((r) => (
                                <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="session">
                      <AccordionTrigger>Session type</AccordionTrigger>
                      <AccordionContent>
                        <Select
                          value={filters.session_type_id != null ? String(filters.session_type_id) : 'null'}
                          onValueChange={(v) => setFilters((f) => ({ ...f, session_type_id: v === 'null' ? null : parseInt(v, 10) }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="null">Any</SelectItem>
                            {filterOptions?.session_types?.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </ScrollArea>
              )}
              <div className="flex gap-2 mt-4 pt-3 border-t">
                <Button onClick={handleApply} disabled={loading} className="flex-1">
                  {loading ? 'Loading…' : 'Apply'}
                </Button>
                <Button onClick={handleClear} variant="outline">
                  Clear
                </Button>
              </div>
              <div className="mt-auto pt-4 flex justify-start">
              <Button disabled={!(sessions != null && sessions.length > 0)}
              variant="secondary" className="flex-1" onClick={togglePopup}>
                Download Session Files
              </Button>
            </div>
            {DownloadVisible && (
            <div className="w-[200px] my-5 space-y-2">
  <div className="flex justify-between text-sm font-medium">
    <span>Processing Files</span>
    <span>{Progress}%</span>
  </div>

  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
    <div
      className="h-full bg-primary transition-all duration-500 ease-in-out"
      style={{ width: `${Progress}%` }}
    />
  </div>

  <div className="text-xs text-muted-foreground text-right">
    {FilesComplete} / {TotalFiles} files prepared
  </div>
</div> )}
            </Card>
          </aside>

          {/* Main content - summary cards + chart */}
          <main className="flex-1 min-w-0">
            {error && (
              <Card className="p-4 mb-4 bg-destructive/10 border-destructive">
                <p className="text-destructive font-medium">{error}</p>
              </Card>
            )}
            {result && (
              <TooltipProvider>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                  <Card className="p-4">
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-muted-foreground">Sessions matching filters</p>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          A session is one behavioral experimental trial for a subject rat (e.g. one open-field test).
                        </TooltipContent>
                      </UITooltip>
                    </div>
                    <p className="text-2xl font-bold">{result.total_sessions.toLocaleString()}</p>
                  </Card>
                  {result.counts_by_type.map((c) => (
                    <Card key={c.object_type_id} className="p-4">
                      <div className="flex items-center gap-1">
                        <p className="text-sm text-muted-foreground">{c.object_type_name}</p>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            {c.object_type_name === 'Video' || c.object_type_name.toLowerCase().includes('video')
                              ? 'Video recordings of the behavioral session.'
                              : c.object_type_name.toLowerCase().includes('track')
                                ? 'Track data: position/time from video (e.g. EthoVision).'
                                : `Raw data type: ${c.object_type_name}.`}
                          </TooltipContent>
                        </UITooltip>
                      </div>
                      <p className="text-2xl font-bold">{c.file_count.toLocaleString()} files</p>
                      <p className="text-xs text-muted-foreground">{c.session_count.toLocaleString()} sessions</p>
                    </Card>
                  ))}
                </div>
                {chartData.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Counts by data type</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Files']} />
                          <Bar dataKey="files" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                            {chartData.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewSessions}
                    disabled={loading || sessionsLoading || !result}
                  >
                    {sessionsLoading ? 'Loading…' : 'View sessions (up to 500)'}
                  </Button>
                </div>
                {sessions != null && (
                  <Card className="p-4 mt-4">
                    <h3 className="font-semibold mb-3">Sessions ({sessions.length})</h3>
                    <ScrollArea className="h-[300px] w-full rounded border">
                      <ScrollBar orientation='horizontal'/>
                      <table className="w-max text-sm border-collapse">
                        <thead>
                          <tr className="bg-muted sticky top-0">
                            {sessions.length > 0 && Object.keys(sessions[0]).map((k) => (
                              <th key={k} className="text-left py-2 px-3 font-medium">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sessions.map((row, i) => (
                            <tr key={i} className="border-b">
                              {Object.values(row).map((v, j) => (
                                <td key={j} className="py-1.5 px-3">{String(v ?? '')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </Card>
                )}
              </TooltipProvider>
            )}
            {!result && !error && !loading && (
              <Card className="p-8 text-center text-muted-foreground">
                <p>Select filters and click Apply to see inventory counts by data type.</p>
              </Card>
            )}

            <div className="flex items-center space-x-2">
              <Popup open={open} onOpenChange={setOpen}>

                <PopupContent>
                  <PopupHeader>
                    <PopupTitle> Download Session Files
                    </PopupTitle>
                    <PopupDescription>
                      The download action will download files related to every session
                      queried in your previous search. If you would like to refine your search before downloading,
                      please cancel.
                    </PopupDescription>

                    <br></br>

                  </PopupHeader>

                  <PopupTitle>Select Desired File Extensions:</PopupTitle>

                  <Checkbox id="downloadCsv" checked={CsvChecked} onCheckedChange={(val) => SetCsvChecked(val === true)} />
                  <label htmlFor="downloadCsv" className="text-sm font-medium leading-none"> CSV </label>
                  <br></br>
                  <Checkbox id="downloadEwb" checked={EwbChecked} onCheckedChange={(val) => SetEwbChecked(val === true)} />
                  <label htmlFor="downloadEwb" className="text-sm font-medium leading-none"> EWB </label>
                  <br></br>
                  <Checkbox id="downloadGif" checked={GifChecked} onCheckedChange={(val) => SetGifChecked(val === true)} />
                  <label htmlFor="downloadGif" className="text-sm font-medium leading-none"> GIF </label>
                  <br></br>
                  <Checkbox id="downloadJpg" checked={JpgChecked} onCheckedChange={(val) => SetJpgChecked(val === true)} />
                  <label htmlFor="downloadJpg" className="text-sm font-medium leading-none"> JPG </label>
                  <br></br>
                  <Checkbox id="downloadMpg" checked={MpgChecked} onCheckedChange={(val) => SetMpgChecked(val === true)} />
                  <label htmlFor="downloadMpg" className="text-sm font-medium leading-none"> MPG </label>

                  <br></br>

                  <PopupFooter>
                    <Button
                      variant="secondary"
                      onClick={() => setOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => {
                      fetchFiles(String(CsvChecked), String(EwbChecked), String(JpgChecked), String(MpgChecked), String(GifChecked));
                      setOpen(false);
                    }}>Download</Button>
                  </PopupFooter>
                </PopupContent>
              </Popup>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
