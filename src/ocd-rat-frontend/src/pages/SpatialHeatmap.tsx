import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { API_BASE_URL } from '@/config';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface TrajectoryPoint {
  Time: number;
  X: number;
  Y: number;
}

interface SessionData {
  sessionId: string;
  data: TrajectoryPoint[];
}

interface HeatmapBin {
  x: number;
  y: number;
  count: number;
  time: number;
  sessions: string[];
}

interface RegionMarker {
  points: { x: number; y: number }[];
  label?: string;
}

const VALID_BIN_SIZES = [1, 2, 4, 5, 8, 10, 16, 20, 32, 40, 80, 160];

export function SpatialHeatmap() {
  const [sessions, setSessions] = useState<string[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [sessionData, setSessionData] = useState<SessionData[]>([]);
  const [unsupportedSessions, setUnsupportedSessions] = useState<string[]>([]);
  const [binSize, setBinSize] = useState<number>(10);
  
  const [homeBase, setHomeBase] = useState<RegionMarker | null>(null);
  const [markedObjects, setMarkedObjects] = useState<RegionMarker[]>([]);
  
  const [regionPts, setRegionPts] = useState({
    tl: { x: 0, y: 0 },
    tr: { x: 0, y: 0 },
    bl: { x: 0, y: 0 },
    br: { x: 0, y: 0 }
  });
  const [markerLabel, setMarkerLabel] = useState('');

  const [metric, setMetric] = useState<'frequency' | 'time'>('frequency');
  const [customMax, setCustomMax] = useState<number | ''>(''); 
  
  const [loading, setLoading] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapBin[][]>([]);
  const [maxValue, setMaxValue] = useState(0);
  const [hoveredBin, setHoveredBin] = useState<{x: number, y: number, value: number, sessions: string[]} | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sessionCache = useRef<Record<string, TrajectoryPoint[]>>({});

  const [totalTime, setTotalTime] = useState(0);
  const [homeTime, setHomeTime] = useState(0);
  const totalPoints = sessionData.reduce((acc, curr) => acc + curr.data.length, 0);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const baseUrl = API_BASE_URL.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/toolbox/dropdown/?input=`);
        const data = await response.json();
        setSessions(data.data || []);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };
    fetchSessions();
  }, []);

  useEffect(() => {
    const syncSessionData = async () => {
      if (selectedSessions.length === 0) {
        setSessionData([]);
        setHeatmapData([]);
        setUnsupportedSessions([]);
        return;
      }

      setLoading(true);

      const missingSessions = selectedSessions.filter(id => !sessionCache.current[id]);

      if (missingSessions.length > 0) {
        const fetchPromises = missingSessions.map(async (id) => {
          try {
            const baseUrl = API_BASE_URL.replace(/\/$/, '');
            const response = await fetch(`${baseUrl}/toolbox/session/?session_id=${id}`);
            const result = await response.json();
            
            if (result.status === 'success' && result.data && result.data.length > 0) {
              sessionCache.current[id] = result.data; 
            } else {
              sessionCache.current[id] = [];
            }
          } catch (error) {
            console.error(`Error fetching session ${id}:`, error);
            sessionCache.current[id] = []; 
          }
        });

        await Promise.all(fetchPromises);
      }

      const newSessionData: SessionData[] = [];
      const badSessions: string[] = [];

      for (const id of selectedSessions) {
        if (sessionCache.current[id] && sessionCache.current[id].length > 0) {
          newSessionData.push({ sessionId: id, data: sessionCache.current[id] });
        } else {
          badSessions.push(id);
        }
      }

      setSessionData(newSessionData);
      setUnsupportedSessions(badSessions);
      setLoading(false);
    };

    syncSessionData();
  }, [selectedSessions]);

  const handleSessionToggle = (sessionId: string) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId) 
        ? prev.filter(id => id !== sessionId) 
        : [...prev, sessionId]
    );
  };

  useEffect(() => {
    if (sessionData.length > 0) generateHeatmap(sessionData, binSize, metric);
  }, [binSize, metric, sessionData]);

  const isPointInPolygon = (point: { x: number, y: number }, polygon: { x: number, y: number }[]) => {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      let xi = polygon[i].x, yi = polygon[i].y;
      let xj = polygon[j].x, yj = polygon[j].y;
      let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  useEffect(() => {
    if (sessionData.length === 0) {
      setTotalTime(0); setHomeTime(0); return;
    }
    
    let tTime = 0, hTime = 0;
    
    sessionData.forEach(session => {
      const sortedData = [...session.data].sort((a, b) => Number(a.Time) - Number(b.Time));

      for (let i = 0; i < sortedData.length; i++) {
        const p = sortedData[i];
        const pNext = sortedData[i + 1];
        
        let dt = 0;
        if (pNext) {
          dt = Math.max(0, Number(pNext.Time) - Number(p.Time));
        } else if (i > 0) {
          dt = Math.max(0, Number(p.Time) - Number(sortedData[i - 1].Time));
        }

        tTime += dt;

        if (homeBase) {
          if (isPointInPolygon({ x: Number(p.X), y: Number(p.Y) }, homeBase.points)) {
            hTime += dt;
          }
        }
      }
    });
    
    setTotalTime(tTime);
    setHomeTime(hTime);
  }, [sessionData, homeBase]);

  const generateHeatmap = useCallback((data: SessionData[], currentBinSize: number, currentMetric: string) => {
    const arenaSize = 160; 
    const numBins = Math.floor(arenaSize / currentBinSize);
    const bins: HeatmapBin[][] = Array(numBins).fill(null).map(() =>
      Array(numBins).fill(null).map(() => ({ x: 0, y: 0, count: 0, time: 0, sessions: [] }))
    );

    data.forEach(session => {
      const sortedData = [...session.data].sort((a, b) => Number(a.Time) - Number(b.Time));
      
      // Track previous bin to calculate distinct visits/entries
      let prevBinX: number | null = null;
      let prevBinY: number | null = null;

      for (let i = 0; i < sortedData.length; i++) {
        const point = sortedData[i];
        const nextPoint = sortedData[i + 1];

        let dt = 0;
        if (nextPoint) {
          dt = Math.max(0, Number(nextPoint.Time) - Number(point.Time));
        } else if (i > 0) {
          dt = Math.max(0, Number(point.Time) - Number(sortedData[i - 1].Time));
        }

        const x = Math.max(0, Math.min(arenaSize - 1, Number(point.X)));
        const y = Math.max(0, Math.min(arenaSize - 1, Number(point.Y)));
        const binX = Math.floor(x / currentBinSize);
        const binY = Math.floor(y / currentBinSize);

        if (binX >= 0 && binX < numBins && binY >= 0 && binY < numBins) {
          bins[binY][binX].x = binX;
          bins[binY][binX].y = binY;
          
          if (!bins[binY][binX].sessions.includes(session.sessionId)) {
            bins[binY][binX].sessions.push(session.sessionId);
          }
          
          // 1. Calculate Distinct Entries (Frequency)
          if (binX !== prevBinX || binY !== prevBinY) {
            bins[binY][binX].count += 1;
          }
          
          // 2. Calculate Cumulative Time (Seconds)
          bins[binY][binX].time += dt;

          // Update tracking variable for the next point
          prevBinX = binX;
          prevBinY = binY;
        } else {
          // If the rat leaves the arena bounds, reset so re-entry counts
          prevBinX = null;
          prevBinY = null;
        }
      }
    });
    
    // Determine the max value across the entire board for coloring
    let maxVal = 0;
    bins.forEach(row => {
      row.forEach(bin => {
        const value = currentMetric === 'frequency' ? bin.count : bin.time;
        if (value > maxVal) maxVal = value;
      });
    });

    setHeatmapData(bins);
    setMaxValue(maxVal);
  }, []);

  const updateRegionPt = (corner: 'tl' | 'tr' | 'bl' | 'br', axis: 'x' | 'y', val: number) => {
    setRegionPts(prev => ({
      ...prev,
      [corner]: { ...prev[corner], [axis]: val }
    }));
  };

  const getOrderedPolygon = () => [
    regionPts.tl, regionPts.tr, regionPts.br, regionPts.bl
  ];

  const exportHeatmapCSV = () => {
    const csvData = [['X_cm', 'Y_cm', 'Value', 'Sessions', 'Metric']];
    heatmapData.forEach((row, y) => {
      row.forEach((bin, x) => {
        // Now only exports data if a rat actually visited or spent time there
        const val = metric === 'frequency' ? bin.count : bin.time;
        if (val > 0) {
          csvData.push([(x * binSize).toString(), (y * binSize).toString(), val.toString(), bin.sessions.join(';'), metric]);
        }
      });
    });
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spatial_heatmap_${metric}_${binSize}cm_bins.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportHeatmapPNG = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `spatial_heatmap_${metric}_${binSize}cm_bins.png`;
    a.click();
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const numBins = Math.floor(160 / binSize);
    const binX = Math.floor(x / (canvasRef.current.width / numBins));
    const binY = Math.floor(y / (canvasRef.current.height / numBins));

    if (binX >= 0 && binX < numBins && binY >= 0 && binY < numBins && heatmapData[binY]?.[binX]) {
      const bin = heatmapData[binY][binX];
      const value = metric === 'frequency' ? bin.count : bin.time;
      setHoveredBin({ x: binX, y: binY, value, sessions: bin.sessions });
    } else {
      setHoveredBin(null);
    }
  };

  const effectiveMax = customMax !== '' ? customMax : maxValue;
  const universalGradient = 'linear-gradient(to right, hsla(240, 100%, 50%, 0.85), hsla(180, 100%, 50%, 0.85), hsla(120, 100%, 50%, 0.85), hsla(60, 100%, 50%, 0.85), hsla(0, 100%, 50%, 0.85))';

  useEffect(() => {
    if (!canvasRef.current || heatmapData.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const numBins = heatmapData.length;
    const cellSize = canvas.width / numBins;
    const scale = canvas.width / 160; 

    heatmapData.forEach((row, y) => {
      row.forEach((bin, x) => {
        // Must check if it actually has time OR counts depending on metric
        const val = metric === 'frequency' ? bin.count : bin.time;
        
        if (val > 0) {
          const normalized = effectiveMax > 0 ? Math.pow(Math.min(val, effectiveMax) / effectiveMax, 0.4) : 0; 
          const hue = (1 - normalized) * 240;
          ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.85)`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      });
    });

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    ctx.font = '10px Arial';
    ctx.fillStyle = '#64748b'; 
    
    const labelInterval = binSize < 16 ? 20 : binSize; 

    for (let i = 0; i <= numBins; i++) {
      const px = i * cellSize;
      const cmVal = i * binSize;
      
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, px); ctx.lineTo(canvas.width, px); ctx.stroke();

      if (cmVal % labelInterval === 0) {
        if (cmVal !== 0 && cmVal !== 160) {
          ctx.fillText(`${cmVal}`, px + 2, 12); 
          ctx.fillText(`${cmVal}`, 2, px + 12); 
        }
      }
    }
    ctx.fillText('0', 2, 12);
    ctx.fillText('160', canvas.width - 22, 12);
    ctx.fillText('160', 2, canvas.height - 4);

    const drawPolygon = (marker: RegionMarker, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      marker.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x * scale, p.y * scale);
        else ctx.lineTo(p.x * scale, p.y * scale);
      });
      ctx.closePath();
      ctx.stroke();

      if (marker.label) {
        ctx.fillStyle = color;
        ctx.font = 'bold 14px Arial';
        ctx.fillText(marker.label, (marker.points[0].x * scale) + 4, (marker.points[0].y * scale) - 6);
      }
    };

    if (homeBase) drawPolygon({ ...homeBase, label: 'Home' }, '#a855f7'); 
    markedObjects.forEach(obj => drawPolygon(obj, '#ea580c')); 

  }, [heatmapData, binSize, homeBase, markedObjects, metric, maxValue, customMax, effectiveMax]);

  return (
    <div className="flex flex-col justify-center items-center py-20 px-6 lg:px-40">
      <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance mb-8">
        Spatial Heatmap
      </h1>

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl">

        <Card className="w-full lg:w-[420px]">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Sessions ({selectedSessions.length})</Label>
                <Button variant="outline" size="sm" onClick={() => setSelectedSessions([])} disabled={selectedSessions.length === 0}>
                  Clear All
                </Button>
              </div>
              <ScrollArea className="h-32 border rounded p-2">
                {sessions.length > 0 ? sessions.map(session => (
                  <div key={session} className="flex items-center space-x-2 py-1">
                    <Checkbox id={session} checked={selectedSessions.includes(session)} onCheckedChange={() => handleSessionToggle(session)} />
                    <Label htmlFor={session} className="text-sm cursor-pointer">{session}</Label>
                  </div>
                )) : <p className="text-sm text-gray-500">Loading...</p>}
              </ScrollArea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Bin Size (cm)</Label>
                <Select value={binSize.toString()} onValueChange={(v) => setBinSize(Number(v))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VALID_BIN_SIZES.map(size => <SelectItem key={size} value={size.toString()}>{size} cm</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">{160 / binSize}x{160 / binSize} grid</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Metric</Label>
                <Select value={metric} onValueChange={(v: 'frequency' | 'time') => setMetric(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frequency">Entries (Visits)</SelectItem>
                    <SelectItem value="time">Time Spent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Fixed Scale Max (Optional)</Label>
              <Input 
                type="number" 
                placeholder={`Auto (${maxValue.toFixed(1)})`}
                value={customMax}
                onChange={(e) => setCustomMax(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">Set a limit to visibly see multiple sessions stack "hotter".</p>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium mb-3 block">Mark Regions (Coordinates, cm)</Label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-500">Top Left</Label>
                  <div className="flex gap-1 mt-1">
                    <Input className="h-7 px-1 text-xs" type="number" value={regionPts.tl.x} onChange={e => updateRegionPt('tl', 'x', Number(e.target.value))} placeholder="X" />
                    <Input className="h-7 px-1 text-xs" type="number" value={regionPts.tl.y} onChange={e => updateRegionPt('tl', 'y', Number(e.target.value))} placeholder="Y" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500">Top Right</Label>
                  <div className="flex gap-1 mt-1">
                    <Input className="h-7 px-1 text-xs" type="number" value={regionPts.tr.x} onChange={e => updateRegionPt('tr', 'x', Number(e.target.value))} placeholder="X" />
                    <Input className="h-7 px-1 text-xs" type="number" value={regionPts.tr.y} onChange={e => updateRegionPt('tr', 'y', Number(e.target.value))} placeholder="Y" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500">Bottom Left</Label>
                  <div className="flex gap-1 mt-1">
                    <Input className="h-7 px-1 text-xs" type="number" value={regionPts.bl.x} onChange={e => updateRegionPt('bl', 'x', Number(e.target.value))} placeholder="X" />
                    <Input className="h-7 px-1 text-xs" type="number" value={regionPts.bl.y} onChange={e => updateRegionPt('bl', 'y', Number(e.target.value))} placeholder="Y" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500">Bottom Right</Label>
                  <div className="flex gap-1 mt-1">
                    <Input className="h-7 px-1 text-xs" type="number" value={regionPts.br.x} onChange={e => updateRegionPt('br', 'x', Number(e.target.value))} placeholder="X" />
                    <Input className="h-7 px-1 text-xs" type="number" value={regionPts.br.y} onChange={e => updateRegionPt('br', 'y', Number(e.target.value))} placeholder="Y" />
                  </div>
                </div>
              </div>
              <Input placeholder="Object Label (optional)" className="mb-3 h-8 text-sm" value={markerLabel} onChange={e => setMarkerLabel(e.target.value)} />
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50" onClick={() => setHomeBase({ points: getOrderedPolygon() })}>
                  Set Home
                </Button>
                <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50" onClick={() => setMarkedObjects([...markedObjects, { points: getOrderedPolygon(), label: markerLabel || `Obj ${markedObjects.length + 1}` }])}>
                  Add Object
                </Button>
              </div>
            </div>

            <div className="bg-slate-50 border rounded-md p-3 text-sm space-y-2">
              <h4 className="font-semibold text-xs uppercase text-slate-500">Active Markers</h4>
              {homeBase ? (
                <div className="flex justify-between items-center text-purple-700">
                  <span className="truncate pr-2">Home Base Set</span>
                  <button onClick={() => setHomeBase(null)} className="text-red-500 text-xs hover:underline flex-shrink-0">Clear</button>
                </div>
              ) : <div className="text-slate-400 italic text-xs">No Home Base set</div>}
              
              {markedObjects.map((obj, i) => (
                <div key={i} className="flex justify-between items-center text-orange-700">
                  <span className="truncate pr-2">{obj.label}</span>
                  <button onClick={() => setMarkedObjects(markedObjects.filter((_, idx) => idx !== i))} className="text-red-500 text-xs hover:underline flex-shrink-0">Remove</button>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <Button onClick={exportHeatmapCSV} disabled={heatmapData.length === 0} className="w-full">
                Export Data to CSV
              </Button>
              <Button onClick={exportHeatmapPNG} disabled={heatmapData.length === 0} variant="secondary" className="w-full">
                Export Map to PNG
              </Button>
            </div>

          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Spatial Heatmap ({metric === 'frequency' ? 'Entries' : 'Time'})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[640px]">
                <p className="animate-pulse font-medium text-slate-500">Fetching New Session Data...</p>
              </div>
            ) : heatmapData.length > 0 ? (
              <div className="space-y-4 flex flex-col items-center">
                
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={640}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseLeave={() => setHoveredBin(null)}
                    className="border bg-slate-50"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                  {hoveredBin && (
                    <div className="absolute top-2 right-2 bg-slate-900/90 text-white text-xs rounded py-2 px-3 z-10 pointer-events-none shadow-lg text-right min-w-[140px]">
                      <span className="font-bold text-slate-300">Location:</span> ({hoveredBin.x * binSize}, {hoveredBin.y * binSize}) cm <br />
                      <span className="font-bold text-slate-300">Total {metric === 'frequency' ? 'Entries' : 'Time'}:</span> {hoveredBin.value.toFixed(2)} <br />
                      <span className="font-bold text-slate-300">Sessions Present:</span> {hoveredBin.sessions.length > 0 ? hoveredBin.sessions.join(', ') : 'None'}
                    </div>
                  )}
                </div>

                <div className="flex flex-col w-full max-w-[640px] mt-2">
                  <div 
                    className="h-4 w-full rounded-sm border" 
                    style={{ background: universalGradient }} 
                  />
                  <div className="flex justify-between text-xs font-semibold text-slate-600 mt-1">
                    <span>0</span>
                    <span>{Number(effectiveMax).toFixed(2)} {metric === 'frequency' ? 'entries' : 'seconds'} {customMax !== '' && '(Locked)'}</span>
                  </div>
                </div>

                <div className="flex w-full justify-between px-2 text-sm text-slate-500 font-medium mt-2">
                  <span>Sessions Mapped: {sessionData.length}</span>
                  <span>Total Datapoints Mapped: {totalPoints.toLocaleString()}</span>
                </div>

                {unsupportedSessions.length > 0 && (
                  <div className="w-full mt-2 p-3 bg-red-50 text-red-700 text-sm border border-red-200 rounded-md">
                    <strong>Missing / Unsupported Data:</strong> The following selected sessions returned no points and were skipped: {unsupportedSessions.join(', ')}
                  </div>
                )}

                {homeBase && totalTime > 0 && (
                  <div className="mt-2 p-4 bg-purple-50 border border-purple-200 rounded-lg w-full max-w-[640px] text-center shadow-sm">
                    <h4 className="text-purple-800 font-bold text-lg mb-2">
                      Home Base Ratio: {((homeTime / totalTime) * 100).toFixed(1)}%
                    </h4>
                    <p className="text-xs text-purple-700 font-mono bg-purple-100/50 py-1.5 px-3 rounded inline-block border border-purple-200">
                      Formula: (Time in Home Base: {homeTime.toFixed(1)}s) / (Total Time: {totalTime.toFixed(1)}s)
                    </p>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[640px] border border-dashed rounded-lg bg-slate-50 text-slate-400 p-6 text-center">
                <p>Select sessions from the controls to generate the heatmap.</p>
                {unsupportedSessions.length > 0 && (
                  <p className="text-red-500 mt-4 text-sm bg-red-50 p-2 rounded border border-red-200">
                    Note: The session(s) you selected ({unsupportedSessions.join(', ')}) do not contain any supported trajectory data.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}