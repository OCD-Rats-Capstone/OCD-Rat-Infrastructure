import { useState, useEffect, useRef, useMemo } from "react";
import { Slider } from "@/components/ui/slider";

interface Point {
  x: number;
  y: number;
  t: number; // Make sure this is being passed from ToolBox.tsx!
}

interface SvgPoint {
  sx: number;
  sy: number;
  t: number;
  v: number;
  color: string;
}

interface PathPlotProps {
  points: Point[]; 
}

export function PathPlot({ points }: PathPlotProps) {
  const PAD = 40;
  const W = 500;
  const H = 500;
  const PLOT_W = W - PAD * 2;
  const PLOT_H = H - PAD * 2;

const xVals = points.map((p) => p.x);
const yVals = points.map((p) => p.y);
console.log(points);
console.log(xVals);
const MIN_X = xVals.reduce((a, b) => Math.min(a, b), Infinity);
const MAX_X = xVals.reduce((a, b) => Math.max(a, b), -Infinity);
const MIN_Y = yVals.reduce((a, b) => Math.min(a, b), Infinity);
const MAX_Y = yVals.reduce((a, b) => Math.max(a, b), -Infinity);

const barRef = useRef<HTMLDivElement>(null);

console.log(MIN_X);
console.log(MAX_X);

function toSvg(px: number, py: number): SvgPoint {

  return {
    sx: PAD + ((px - MIN_X) / (MAX_X - MIN_X)) * PLOT_W,
    sy: PAD + (1 - (py - MIN_Y) / (MAX_Y - MIN_Y)) * PLOT_H,
  };
}

  // 2. Timeline State
  const minTime = points.length > 0 ? points[0].t : 0;
  const maxTime = points.length > 0 ? points[points.length - 1].t : 100;
  const [timeRange, setTimeRange] = useState<[number, number]>([minTime, maxTime]);

  // Sync slider when new session is loaded
  useEffect(() => {
    if (points.length > 0) {
      setTimeRange([points[0].t, points[points.length - 1].t]);
    }
  }, [points]);

  // 3. Process Velocity and Color Mapping
  const segments = useMemo(() => {
    if (points.length < 2) return [];
    
    const processed = [];
    let maxV = 0;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let v = 0;

      // Calculate velocity based on next point
      if (i < points.length - 1) {
        const pNext = points[i + 1];
        const dx = pNext.x - p.x;
        const dy = pNext.y - p.y;
        const dt = pNext.t - p.t;
        if (dt > 0) {
          v = Math.sqrt(dx * dx + dy * dy) / dt;
          if (v > maxV) maxV = v;
        }
      }
      processed.push({ ...toSvg(p.x, p.y), t: p.t, v });
    }

    // 95th Percentile cap protects color scale from teleporting/glitching frames
    const sortedV = [...processed].map(p => p.v).sort((a, b) => a - b);
    const p95 = sortedV[Math.floor(sortedV.length * 0.95)] || maxV;

    // Apply colors
    return processed.map(pt => {
      const ratio = p95 === 0 ? 0 : Math.min(pt.v / p95, 1);
      let r, g, b = 0;
      if (ratio < 0.5) {
        // Green to Yellow
        r = Math.floor(255 * (ratio / 0.5));
        g = 255;
      } else {
        // Yellow to Red
        r = 255;
        g = Math.floor(255 * (1 - (ratio - 0.5) / 0.5));
      }
      return { ...pt, color: `rgb(${r},${g},${b})` };
    });
  }, [points]);

  // 4. Filter segments based on the slider window
  const activeSegments = useMemo(() => {
    return segments.filter(p => p.t >= timeRange[0] && p.t <= timeRange[1]);
  }, [segments, timeRange]);

  // 5. Animation logic
  const [visibleCount, setVisibleCount] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(4);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const accRef = useRef<number>(0);

  // If user scrubs the timeline, stop playing and reset animation to the start of the new window
  useEffect(() => {
    setVisibleCount(0);
    setPlaying(false);
    lastTimeRef.current = null;
  }, [timeRange]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = (ts: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = ts;
      const dt = ts - lastTimeRef.current;
      lastTimeRef.current = ts;
      accRef.current += dt * speed * 0.05;
      const steps = Math.floor(accRef.current);
      accRef.current -= steps;
      
      setVisibleCount((c) => {
        const next = c + steps;
        if (next >= activeSegments.length) {
          setPlaying(false);
          return activeSegments.length;
        }
        if (barRef.current) {
          barRef.current.style.width = `${Math.min(next / points.length * 100, 100)}%`;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
      
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, speed, activeSegments.length]);

  const reset = () => {
    setPlaying(false);
    setVisibleCount(0);
    lastTimeRef.current = null;
    accRef.current = 0;
  };

  const handlePlayPause = () => {
    if (visibleCount >= activeSegments.length) reset();
    lastTimeRef.current = null;
    setPlaying((p) => !p);
  };

  const playLabel = playing ? "PAUSE" : visibleCount >= activeSegments.length ? "REPLAY" : visibleCount > 0 ? "RESUME" : "PLAY";

  // Grab the current point for the glowing dot
  const current: SvgPoint | null =
    visibleCount > 0 && activeSegments.length > 0
      ? activeSegments[visibleCount - 1] 
      : null;

  if (points.length === 0) return null;

  return (
    <div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap');`}</style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2
          style={{
            color: "#0a2832",
            letterSpacing: "0.18em",
            fontSize: 13,
            textTransform: "uppercase",
            margin: 0,
            opacity: 0.7,
          }}
        >
          Kinematic Trajectory
        </h2>
      </div>

      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 0 40px #00c8ff18, 0 2px 16px #0004",
        }}
      >
        <svg width={W} height={H} style={{ display: "block" }}>
          {/* Arena Border */}
          <rect x={PAD} y={PAD} width={PLOT_W} height={PLOT_H} fill="none" stroke="#1e3a52" strokeWidth={1.5} rx={2} />

          {/* Render Active Velocity Segments */}
          {activeSegments.slice(0, visibleCount).map((pt, i, arr) => {
            if (i === arr.length - 1) return null; 
            const nextPt = arr[i + 1];
            return (
              <line
                key={i}
                x1={pt.sx}
                y1={pt.sy}
                x2={nextPt.sx}
                y2={nextPt.sy}
                stroke={pt.color}
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}

          {/* Dynamic Colored Glowing Dot */}
          {current && (
            <g>
              <circle cx={current.sx} cy={current.sy} r={6} fill="none" stroke={current.color} strokeWidth={1.5} opacity={0.5} />
              <circle cx={current.sx} cy={current.sy} r={3} fill={current.color} style={{ filter: `drop-shadow(0 0 6px ${current.color})` }} />
            </g>
          )}
        </svg>

        {/* Velocity Legend */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#4a6fa5", marginTop: 16, padding: "0 12px", fontWeight: 600, textTransform: 'uppercase' }}>
          <span>Slow</span>
          <div style={{ flex: 1, margin: "0 12px", height: 6, borderRadius: 3, background: "linear-gradient(to right, rgb(0,255,0), rgb(255,255,0), rgb(255,0,0))" }} />
          <span>Fast</span>
        </div>
      </div>

      {/* Animation Controls */}
      <div style={{ display: "flex", gap: 12, marginTop: 18, alignItems: "center" }}>
        <button
          onClick={handlePlayPause}
          style={{
            background: playing ? "#0e2a3a" : "#00c8ff",
            color: playing ? "#00c8ff" : "#0b0f1a",
            border: "1.5px solid #00c8ff",
            borderRadius: 6,
            padding: "7px 22px",
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.1em",
            transition: 'all 0.2s ease'
          }}
        >
          {playLabel}
        </button>
        <button
          onClick={reset}
          style={{
            background: "transparent",
            color: "#4a6fa5",
            border: "1.5px solid #1e2d40",
            borderRadius: 6,
            padding: "7px 16px",
            fontFamily: "inherit",
            fontSize: 12,
            cursor: "pointer",
            letterSpacing: "0.1em",
          }}
        >
          RESET
        </button>
      </div>

      {/* Timeline Controls */}
      <div style={{ marginTop: 20, background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "#1e2d40", marginBottom: 12 }}>
          <span>Start: {timeRange[0].toFixed(1)}s</span>
          <span style={{ color: "#64748b", textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline Window</span>
          <span>End: {timeRange[1].toFixed(1)}s</span>
        </div>
        
        <Slider
          min={minTime}
          max={maxTime}
          step={0.1}
          value={[timeRange[0], timeRange[1]]}
          onValueChange={(val) => setTimeRange([val[0], val[1]])}
        />
      </div>

    </div>
  );
}