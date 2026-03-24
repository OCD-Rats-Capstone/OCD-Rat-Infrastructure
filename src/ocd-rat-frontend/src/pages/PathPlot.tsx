import { useState, useEffect, useRef } from "react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface Point {
  x: number;
  y: number;
}

interface SvgPoint {
  sx: number;
  sy: number;
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

console.log(MIN_X);
console.log(MAX_X);

function toSvg(px: number, py: number): SvgPoint {

  return {
    sx: PAD + ((px - MIN_X) / (MAX_X - MIN_X)) * PLOT_W,
    sy: PAD + (1 - (py - MIN_Y) / (MAX_Y - MIN_Y)) * PLOT_H,
  };
}

const fullPathD = points.reduce((acc, p, i) => {
  const { sx, sy } = toSvg(p.x, p.y);
  return acc + (i === 0 ? `M ${sx} ${sy}` : ` L ${sx} ${sy}`);
}, "");

const startDot = toSvg(points[0].x, points[0].y);

  const [visibleCount, setVisibleCount] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(4);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const accRef = useRef<number>(0);

  const pathD = points.slice(0, visibleCount).reduce((acc, p, i) => {
    const { sx, sy } = toSvg(p.x, p.y);
    return acc + (i === 0 ? `M ${sx} ${sy}` : ` L ${sx} ${sy}`);
  }, "");

  const current: SvgPoint | null =
    visibleCount > 0 ? toSvg(points[visibleCount - 1].x, points[visibleCount - 1].y) : null;

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
        if (next >= points.length) {
          setPlaying(false);
          return points.length;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, speed]);

  const reset = () => {
    setPlaying(false);
    setVisibleCount(0);
    lastTimeRef.current = null;
    accRef.current = 0;
  };

  const handlePlayPause = () => {
    if (visibleCount >= points.length) reset();
    lastTimeRef.current = null;
    setPlaying((p) => !p);
  };

  const playLabel = playing ? "PAUSE" : visibleCount >= points.length ? "REPLAY" : visibleCount > 0 ? "RESUME" : "PLAY";

  return (
        <div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap');`}</style>
      <h2
        style={{
          color: "#0a2832",
          letterSpacing: "0.18em",
          fontSize: 13,
          textTransform: "uppercase",
          marginBottom: 20,
          opacity: 0.7,
        }}
      >
        Path Trajectory
      </h2>

      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 0 40px #00c8ff18, 0 2px 16px #0004",
        }}
      >
        <svg width={W} height={H} style={{ display: "block" }}>

          <rect x={PAD} y={PAD} width={PLOT_W} height={PLOT_H} fill="none" stroke="#1e3a52" strokeWidth={1.5} rx={2} />

          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#00c8ff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 4px #00c8ff88)" }}
            />
          )}

          {current && (
            <g>
              <circle cx={current.sx} cy={current.sy} r={6} fill="none" stroke="#00c8ff" strokeWidth={1.5} opacity={0.4} />
              <circle cx={current.sx} cy={current.sy} r={3} fill="#00ff99" style={{ filter: "drop-shadow(0 0 6px #00c8ff)" }} />
            </g>
          )}
        </svg>
      </div>

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
    </div>

  );
}