import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/config';
import {
  VelocityProfileChart,
  type VelocitySegment,
} from '@/components/VelocityProfileChart';

interface ProfileData {
  status: string;
  exiting_segments: VelocitySegment[];
  entering_segments: VelocitySegment[];
  session_frames: number;
  total_trips: number;
}

export function VelocityProfile() {
  // ── Session selector state ───────────────────────────────────────────────
  const [sessionId, setSessionId] = useState('');
  const [sessionOptions, setSessionOptions] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredSessions = sessionOptions.filter(id =>
    String(id).includes(searchQuery)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterDropdown = async (input: string) => {
    try {
      const baseUrl = API_BASE_URL.replace(/\/$/, '');
      const url = `${baseUrl}/toolbox/dropdown/?${new URLSearchParams({ input })}`;
      const res = await fetch(url);
      const data = await res.json();
      setSessionOptions(data['data'] ?? []);
    } catch (err) {
      console.error('Dropdown fetch error:', err);
    }
  };

  // ── Zone and parameter state ─────────────────────────────────────────────
  const [locationX, setLocationX] = useState('');
  const [locationY, setLocationY] = useState('');
  const [radius, setRadius] = useState('30');
  const [maxFrames, setMaxFrames] = useState('150');
  const [minTripFrames, setMinTripFrames] = useState('5');

  // ── Color mode state ─────────────────────────────────────────────────────
  const [colorMode, setColorMode] = useState<'gradient' | 'timeslice'>('gradient');
  const [sliceRange, setSliceRange] = useState<[number, number]>([0, 0]);

  // ── Result state ─────────────────────────────────────────────────────────
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Generate handler ─────────────────────────────────────────────────────
  const generate = async () => {
    if (!sessionId) {
      setError('Please select a session.');
      return;
    }
    if (locationX === '' || locationY === '') {
      setError('Please enter zone X and Y coordinates.');
      return;
    }
    const r = parseFloat(radius);
    if (!r || r <= 0) {
      setError('Radius must be a positive number.');
      return;
    }

    setLoading(true);
    setError(null);
    setProfileData(null);

    try {
      const baseUrl = API_BASE_URL.replace(/\/$/, '');
      const params = new URLSearchParams({
        session_id: sessionId,
        location_x: locationX,
        location_y: locationY,
        radius: String(r),
        max_frames: maxFrames || '150',
        min_trip_frames: minTripFrames || '5',
      });
      const res = await fetch(`${baseUrl}/toolbox/velocity-profile/?${params}`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data: ProfileData = await res.json();

      if (data.status !== 'success') {
        setError(`Could not generate profile: ${data.status}`);
        return;
      }

      setProfileData(data);
      // Reset slice range to cover all trips
      setSliceRange([0, Math.max(0, data.total_trips - 1)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollArea className="w-full h-full">
      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Velocity Profile
          </h1>
          <p className="text-lg text-gray-600">
            Compare how fast a rat leaves and returns to a user-defined location across an
            entire session. Each line is one trip, coloured by temporal order.
          </p>
        </div>

        <Separator />

        {/* ── Session selector ── */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">1. Select session</h2>
          <div className="relative w-72" ref={dropdownRef}>
            <input
              type="text"
              placeholder="Search or select a session…"
              value={dropdownOpen ? searchQuery : sessionId ? `Session ${sessionId}` : ''}
              onChange={e => {
                filterDropdown(e.target.value);
                setSearchQuery(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => {
                setSearchQuery('');
                setDropdownOpen(true);
              }}
              className="border rounded-md px-4 py-2 w-full cursor-pointer"
            />
            {dropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredSessions.length > 0 ? (
                  filteredSessions.map(id => (
                    <div
                      key={id}
                      className="px-4 py-2 cursor-pointer hover:bg-muted text-sm"
                      onMouseDown={() => {
                        setSessionId(String(id));
                        setSearchQuery('');
                        setDropdownOpen(false);
                      }}
                    >
                      Session {id}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 text-sm text-gray-400">No sessions found</div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Zone definition ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">2. Define zone</h2>
          <p className="text-sm text-gray-500">
            Enter the centre coordinates and radius of the location of interest in the same
            units as the tracking data. You can inspect coordinate values in the Analysis
            Toolbox.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Zone X
              <input
                type="number"
                value={locationX}
                onChange={e => setLocationX(e.target.value)}
                placeholder="e.g. 250"
                className="border rounded-md px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Zone Y
              <input
                type="number"
                value={locationY}
                onChange={e => setLocationY(e.target.value)}
                placeholder="e.g. 250"
                className="border rounded-md px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Radius
              <input
                type="number"
                min="1"
                value={radius}
                onChange={e => setRadius(e.target.value)}
                className="border rounded-md px-3 py-2"
              />
            </label>
          </div>
        </section>

        {/* ── Parameters ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">3. Parameters</h2>
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Max frames per side
              <input
                type="number"
                min="10"
                max="500"
                value={maxFrames}
                onChange={e => setMaxFrames(e.target.value)}
                className="border rounded-md px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Min trip frames
              <input
                type="number"
                min="1"
                value={minTripFrames}
                onChange={e => setMinTripFrames(e.target.value)}
                className="border rounded-md px-3 py-2"
              />
              <span className="text-xs text-gray-400 font-normal">
                Shorter trips are treated as lingering and excluded.
              </span>
            </label>
          </div>
        </section>

        {/* ── Colouring mode ── */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">4. Colouring</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setColorMode('gradient')}
              className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                colorMode === 'gradient'
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Temporal gradient
            </button>
            <button
              onClick={() => setColorMode('timeslice')}
              className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                colorMode === 'timeslice'
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Time-slice highlight
            </button>
          </div>
          {colorMode === 'gradient' && (
            <p className="text-sm text-gray-500">
              Lines are coloured with a high-contrast temporal gradient (earliest to latest),
              with contrast-boosted bins to make neighbouring trips easier to distinguish.
            </p>
          )}
          {colorMode === 'timeslice' && (
            <p className="text-sm text-gray-500">
              All trips are shown in grey. Use the slider below the chart to select a subset
              of trips to highlight in blue.
            </p>
          )}
        </section>

        {/* ── Generate button ── */}
        <Button
          onClick={generate}
          disabled={loading}
          className="w-40"
        >
          {loading ? 'Generating…' : 'Generate'}
        </Button>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Results ── */}
        {profileData && profileData.total_trips > 0 && (
          <section className="space-y-6">
            <Separator />

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total trips" value={String(profileData.total_trips)} />
              <StatCard
                label="Exiting segments"
                value={String(profileData.exiting_segments.length)}
              />
              <StatCard
                label="Entering segments"
                value={String(profileData.entering_segments.length)}
              />
              <StatCard
                label="Session frames"
                value={profileData.session_frames.toLocaleString()}
              />
            </div>

            <VelocityProfileChart
              exitingSegments={profileData.exiting_segments}
              enteringSegments={profileData.entering_segments}
              colorMode={colorMode}
              sliceRange={sliceRange}
              totalTrips={profileData.total_trips}
              onSliceRangeChange={setSliceRange}
            />
          </section>
        )}

        {/* Empty result (success but zero trips) */}
        {profileData && profileData.total_trips === 0 && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            No qualifying move segments found for this zone. Try a larger radius or a smaller
            minimum trip length.
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// ── Small helper component ────────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
