import { useMemo } from 'react';
import { Slider } from '@/components/ui/slider';

export interface SegmentDatum {
  frame: number;
  velocity: number;
}

export interface VelocitySegment {
  trip_id: number;
  temporal_order: number;
  total_segments: number;
  segment_data: SegmentDatum[];
}

interface VelocityProfileChartProps {
  exitingSegments: VelocitySegment[];
  enteringSegments: VelocitySegment[];
  colorMode: 'gradient' | 'timeslice';
  sliceRange: [number, number];
  totalTrips: number;
  onSliceRangeChange: (range: [number, number]) => void;
}

const W = 1120;
const H = 560;
const PAD = { left: 72, right: 30, top: 44, bottom: 60 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const Y_HEADROOM_FACTOR = 1.12;

// Viridis-like stops (perceptually uniform, high contrast, colorblind-friendly)
const TEMPORAL_STOPS: Array<{ t: number; color: [number, number, number] }> = [
  { t: 0, color: [68, 1, 84] },
  { t: 0.25, color: [59, 82, 139] },
  { t: 0.5, color: [33, 145, 140] },
  { t: 0.75, color: [94, 201, 98] },
  { t: 1, color: [253, 231, 37] },
];

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateStops(t: number): string {
  const tt = clamp01(t);
  for (let i = 0; i < TEMPORAL_STOPS.length - 1; i++) {
    const a = TEMPORAL_STOPS[i];
    const b = TEMPORAL_STOPS[i + 1];
    if (tt >= a.t && tt <= b.t) {
      const localT = (tt - a.t) / (b.t - a.t);
      const r = Math.round(lerp(a.color[0], b.color[0], localT));
      const g = Math.round(lerp(a.color[1], b.color[1], localT));
      const bch = Math.round(lerp(a.color[2], b.color[2], localT));
      return `rgb(${r},${g},${bch})`;
    }
  }
  const last = TEMPORAL_STOPS[TEMPORAL_STOPS.length - 1].color;
  return `rgb(${last[0]},${last[1]},${last[2]})`;
}

export function VelocityProfileChart({
  exitingSegments,
  enteringSegments,
  colorMode,
  sliceRange,
  totalTrips,
  onSliceRangeChange,
}: VelocityProfileChartProps) {
  // ── Compute axis ranges ──────────────────────────────────────────────────
  const { minFrame, maxFrame, yAxisMaxVel } = useMemo(() => {
    const allFrames: number[] = [];
    const allVels: number[] = [];

    for (const seg of [...exitingSegments, ...enteringSegments]) {
      for (const d of seg.segment_data) {
        allFrames.push(d.frame);
        allVels.push(d.velocity);
      }
    }

    if (allFrames.length === 0) {
      return { minFrame: -100, maxFrame: 100, yAxisMaxVel: 1 };
    }

    const minF = Math.min(...allFrames);
    const maxF = Math.max(...allFrames);

    const maxVelocity = Math.max(...allVels);

    return {
      minFrame: minF,
      maxFrame: maxF,
      yAxisMaxVel: Math.max(maxVelocity * Y_HEADROOM_FACTOR, 0.0001),
    };
  }, [exitingSegments, enteringSegments]);

  const frameRange = Math.max(maxFrame - minFrame, 1);

  const xScale = (frame: number) =>
    PAD.left + ((frame - minFrame) / frameRange) * PLOT_W;

  const yScale = (v: number) =>
    PAD.top + PLOT_H - (Math.min(v, yAxisMaxVel) / yAxisMaxVel) * PLOT_H;

  const zeroX = xScale(0);

  // ── Color helpers ────────────────────────────────────────────────────────
  // Temporal gradient uses quantized bins + non-linear contrast for clearer separation.
  const gradientColor = (order: number, total: number): string => {
    const t = total > 1 ? order / (total - 1) : 0;
    const levels = Math.min(24, Math.max(8, Math.round(total / 3)));
    const quantized = levels > 1 ? Math.round(t * (levels - 1)) / (levels - 1) : 0;
    const contrastBoost = Math.pow(quantized, 0.8);
    return interpolateStops(contrastBoost);
  };

  const getColor = (seg: VelocitySegment): string => {
    if (colorMode === 'gradient') {
      return gradientColor(seg.temporal_order, seg.total_segments);
    }
    return seg.temporal_order >= sliceRange[0] && seg.temporal_order <= sliceRange[1]
      ? '#2563eb'
      : '#d1d5db';
  };

  const getOpacity = (seg: VelocitySegment): number => {
    if (colorMode === 'timeslice') {
      return seg.temporal_order >= sliceRange[0] && seg.temporal_order <= sliceRange[1]
        ? 0.85
        : 0.35;
    }
    return 0.88;
  };

  const getUnderlayOpacity = (seg: VelocitySegment): number => {
    if (colorMode === 'timeslice') {
      return seg.temporal_order >= sliceRange[0] && seg.temporal_order <= sliceRange[1]
        ? 0.58
        : 0.2;
    }
    return 0.68;
  };

  const getStrokeWidth = (seg: VelocitySegment): number => {
    if (colorMode === 'timeslice') {
      return seg.temporal_order >= sliceRange[0] && seg.temporal_order <= sliceRange[1]
        ? 1.1
        : 0.9;
    }
    const t = seg.total_segments > 1 ? seg.temporal_order / (seg.total_segments - 1) : 0;
    return 0.95 + t * 0.35;
  };

  const toPoints = (data: SegmentDatum[]): string =>
    data
      .map(d => `${xScale(d.frame).toFixed(1)},${yScale(d.velocity).toFixed(1)}`)
      .join(' ');

  // ── Axis ticks ───────────────────────────────────────────────────────────
  const xTickStep = useMemo(() => {
    const candidates = [5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200];
    return candidates.find(s => frameRange / s <= 9) ?? 200;
  }, [frameRange]);

  const xTicks: number[] = [];
  for (
    let f = Math.ceil(minFrame / xTickStep) * xTickStep;
    f <= maxFrame;
    f += xTickStep
  ) {
    xTicks.push(f);
  }

  const yTicks = Array.from(
    { length: 6 },
    (_, i) => (yAxisMaxVel * i) / 5
  );

  // ── Empty state ──────────────────────────────────────────────────────────
  if (exitingSegments.length === 0 && enteringSegments.length === 0) {
    return (
      <div className="text-center text-gray-500 py-16">
        No qualifying move segments found. Try adjusting the zone coordinates, radius, or
        minimum trip length.
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Gradient legend */}
      {colorMode === 'gradient' && (
        <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
          <span>Earliest trip</span>
          <div
            className="h-3 w-44 rounded"
            style={{
              background:
                'linear-gradient(to right, rgb(68,1,84), rgb(59,82,139), rgb(33,145,140), rgb(94,201,98), rgb(253,231,37))',
            }}
          />
          <span>Latest trip</span>
          <span className="text-xs text-gray-500">Contrast-boosted temporal bins</span>
        </div>
      )}

      {/* Timeslice legend */}
      {colorMode === 'timeslice' && (
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-2 rounded" style={{ background: '#2563eb' }} />
            Selected trips
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-2 rounded" style={{ background: '#d1d5db' }} />
            Other trips
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', maxWidth: W, height: 'auto', display: 'block' }}
          aria-label="Velocity profile chart"
        >
          {/* Plot background */}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={PLOT_W}
            height={PLOT_H}
            fill="#f8fafc"
            stroke="#e2e8f0"
          />

          {/* Side labels above plot */}
          {minFrame < 0 && (
            <text
              x={(PAD.left + zeroX) / 2}
              y={PAD.top - 12}
              textAnchor="middle"
              fontSize={11}
              fill="#6b7280"
            >
              ← Entering
            </text>
          )}
          {maxFrame > 0 && (
            <text
              x={(zeroX + W - PAD.right) / 2}
              y={PAD.top - 12}
              textAnchor="middle"
              fontSize={11}
              fill="#6b7280"
            >
              Exiting →
            </text>
          )}

          {/* Entering segments */}
          {enteringSegments.map(seg => (
            <g key={`enter-${seg.trip_id}`}>
              <polyline
                points={toPoints(seg.segment_data)}
                fill="none"
                stroke="#ffffff"
                strokeWidth={2.2}
                strokeOpacity={getUnderlayOpacity(seg)}
                strokeLinejoin="round"
              />
              <polyline
                points={toPoints(seg.segment_data)}
                fill="none"
                stroke={getColor(seg)}
                strokeWidth={getStrokeWidth(seg)}
                strokeOpacity={getOpacity(seg)}
                strokeLinejoin="round"
              />
            </g>
          ))}

          {/* Exiting segments */}
          {exitingSegments.map(seg => (
            <g key={`exit-${seg.trip_id}`}>
              <polyline
                points={toPoints(seg.segment_data)}
                fill="none"
                stroke="#ffffff"
                strokeWidth={2.2}
                strokeOpacity={getUnderlayOpacity(seg)}
                strokeLinejoin="round"
              />
              <polyline
                points={toPoints(seg.segment_data)}
                fill="none"
                stroke={getColor(seg)}
                strokeWidth={getStrokeWidth(seg)}
                strokeOpacity={getOpacity(seg)}
                strokeLinejoin="round"
              />
            </g>
          ))}

          {/* Zone-boundary line at frame 0 */}
          <line
            x1={zeroX}
            y1={PAD.top}
            x2={zeroX}
            y2={PAD.top + PLOT_H}
            stroke="#374151"
            strokeWidth={1.5}
            strokeDasharray="5,4"
          />

          {/* X axis */}
          <line
            x1={PAD.left}
            y1={PAD.top + PLOT_H}
            x2={PAD.left + PLOT_W}
            y2={PAD.top + PLOT_H}
            stroke="#374151"
          />
          {xTicks.map(f => (
            <g key={f}>
              <line
                x1={xScale(f)}
                y1={PAD.top + PLOT_H}
                x2={xScale(f)}
                y2={PAD.top + PLOT_H + 5}
                stroke="#374151"
              />
              <text
                x={xScale(f)}
                y={PAD.top + PLOT_H + 18}
                textAnchor="middle"
                fontSize={11}
                fill="#374151"
              >
                {f}
              </text>
            </g>
          ))}
          <text
            x={PAD.left + PLOT_W / 2}
            y={H - 6}
            textAnchor="middle"
            fontSize={12}
            fill="#374151"
          >
            Frame offset from zone boundary
          </text>

          {/* Y axis */}
          <line
            x1={PAD.left}
            y1={PAD.top}
            x2={PAD.left}
            y2={PAD.top + PLOT_H}
            stroke="#374151"
          />
          {yTicks.map(v => (
            <g key={v}>
              <line
                x1={PAD.left - 5}
                y1={yScale(v)}
                x2={PAD.left}
                y2={yScale(v)}
                stroke="#374151"
              />
              <text
                x={PAD.left - 8}
                y={yScale(v) + 4}
                textAnchor="end"
                fontSize={11}
                fill="#374151"
              >
                {v.toFixed(1)}
              </text>
            </g>
          ))}
          <text
            x={14}
            y={PAD.top + PLOT_H / 2}
            textAnchor="middle"
            fontSize={12}
            fill="#374151"
            transform={`rotate(-90, 14, ${PAD.top + PLOT_H / 2})`}
          >
            Velocity (units / frame)
          </text>
        </svg>
      </div>

      {/* Timeslice range slider */}
      {colorMode === 'timeslice' && totalTrips > 1 && (
        <div className="space-y-2 pt-1">
          <p className="text-sm font-medium text-gray-700">
            Highlighted trips:{' '}
            <span className="font-semibold text-blue-700">
              {sliceRange[0] + 1}–{sliceRange[1] + 1}
            </span>{' '}
            of {totalTrips}
          </p>
          <Slider
            min={0}
            max={totalTrips - 1}
            step={1}
            value={sliceRange}
            onValueChange={(v: number[]) => onSliceRangeChange([v[0], v[1]] as [number, number])}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
