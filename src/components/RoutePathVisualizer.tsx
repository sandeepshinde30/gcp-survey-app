/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Route, Hotel, MapPin, ArrowRight, Compass, ShieldAlert } from 'lucide-react';
import { GcpRecord, GpsCoordinates } from '../types';
import { formatDistance, formatDistanceCompact } from '../utils/distance';

interface RoutePathVisualizerProps {
  records: GcpRecord[];
  hotelLocation: GpsCoordinates | null;
  accumulatedDistance: number;
}

export const RoutePathVisualizer: React.FC<RoutePathVisualizerProps> = ({
  records,
  hotelLocation,
  accumulatedDistance,
}) => {
  // Sort chronologically (oldest to newest) to see the traversal path
  const pathRecords = [...records].reverse();

  // Compute 2D projected bounding box for schematic SVG
  const points: Array<{
    id: string;
    label: string;
    lat: number;
    lon: number;
    type: 'hotel' | 'gcp';
    status?: string;
    segmentDist?: number;
  }> = [];

  if (hotelLocation) {
    points.push({
      id: 'hotel',
      label: 'Base Hotel',
      lat: hotelLocation.latitude,
      lon: hotelLocation.longitude,
      type: 'hotel',
    });
  }

  pathRecords.forEach((r) => {
    points.push({
      id: r.id,
      label: r.gcpId,
      lat: r.latitude,
      lon: r.longitude,
      type: 'gcp',
      status: r.status,
      segmentDist: r.segmentDistanceMeters,
    });
  });

  // Calculate coordinates bounds
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);

  const minLat = lats.length > 0 ? Math.min(...lats) : 18.52;
  const maxLat = lats.length > 0 ? Math.max(...lats) : 18.53;
  const minLon = lons.length > 0 ? Math.min(...lons) : 73.85;
  const maxLon = lons.length > 0 ? Math.max(...lons) : 73.86;

  const latSpan = Math.max(maxLat - minLat, 0.0008);
  const lonSpan = Math.max(maxLon - minLon, 0.0008);

  const svgWidth = 600;
  const svgHeight = 360;
  const padding = 50;

  const projectPoint = (lat: number, lon: number) => {
    // Mercator/equirectangular projection for local survey area
    const x = padding + ((lon - minLon) / lonSpan) * (svgWidth - padding * 2);
    // Invert Y because latitude goes up north while SVG Y goes down
    const y = svgHeight - padding - ((lat - minLat) / latSpan) * (svgHeight - padding * 2);
    return { x, y };
  };

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Survey Trajectory & Point Chain</h2>
              <p className="text-xs text-slate-400">
                WGS-84 Point-to-Point Segments & Total Accumulated Path
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Total Distance</span>
            <span className="text-lg font-mono font-bold text-emerald-400">
              {formatDistanceCompact(accumulatedDistance)}
            </span>
          </div>
        </div>

        {/* Interactive SVG Schematic Map */}
        <div className="relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center min-h-[360px]">
          {points.length <= 1 ? (
            <div className="p-8 text-center text-slate-400 max-w-sm">
              <Compass className="w-10 h-10 text-slate-600 mx-auto mb-2 animate-spin-slow" />
              <p className="text-xs font-semibold text-slate-300">
                Waiting for Survey Points
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Capture the Base Hotel and at least one GCP point in the Survey Form to see the point-to-point trajectory diagram.
              </p>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto max-h-[400px]"
            >
              {/* Subtle grid lines */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                </marker>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Connecting survey segment lines */}
              {points.map((p, idx) => {
                if (idx === 0) return null;
                const prev = points[idx - 1];
                const pt1 = projectPoint(prev.lat, prev.lon);
                const pt2 = projectPoint(p.lat, p.lon);
                const midX = (pt1.x + pt2.x) / 2;
                const midY = (pt1.y + pt2.y) / 2;

                return (
                  <g key={`seg-${idx}`}>
                    {/* Shadow line */}
                    <line
                      x1={pt1.x}
                      y1={pt1.y}
                      x2={pt2.x}
                      y2={pt2.y}
                      stroke="#0284c7"
                      strokeWidth="3"
                      strokeDasharray="4 3"
                      markerEnd="url(#arrow)"
                    />
                    {/* Segment distance badge */}
                    {p.segmentDist && (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-28"
                          y="-10"
                          width="56"
                          height="18"
                          rx="4"
                          fill="#0f172a"
                          stroke="#38bdf8"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="2"
                          textAnchor="middle"
                          fill="#38bdf8"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {formatDistanceCompact(p.segmentDist)}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Point Markers */}
              {points.map((p, idx) => {
                const pt = projectPoint(p.lat, p.lon);
                const isHotel = p.type === 'hotel';

                return (
                  <g key={`pt-${p.id}`} transform={`translate(${pt.x}, ${pt.y})`}>
                    {/* Halo ring */}
                    <circle
                      r={isHotel ? 14 : 11}
                      fill={isHotel ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.25)'}
                    />
                    {/* Center point */}
                    <circle
                      r={isHotel ? 7 : 5}
                      fill={
                        isHotel
                          ? '#10b981'
                          : p.status === 'abnormal'
                          ? '#f59e0b'
                          : p.status === 'redo'
                          ? '#ef4444'
                          : '#0284c7'
                      }
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    {/* Label */}
                    <text
                      x="0"
                      y={isHotel ? -18 : -14}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {p.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Sequential Segments Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Point-to-Point Leg Breakdown
        </h3>

        {pathRecords.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No survey legs recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {pathRecords.map((r, i) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <span className="font-bold font-mono text-slate-900">{r.gcpId}</span>
                    <span className="text-slate-400 text-[11px] ml-1.5">
                      from {r.prevPointId || 'Origin'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Leg Dist</span>
                    <span className="font-mono font-bold text-blue-600">
                      +{formatDistance(r.segmentDistanceMeters)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Cumulative</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {formatDistance(r.accumulatedDistanceMeters)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
