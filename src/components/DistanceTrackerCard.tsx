/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Route,
  ArrowRight,
  TrendingUp,
  MapPin,
  Hotel,
  Compass,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { formatDistance, formatDistanceCompact } from '../utils/distance';

interface DistanceTrackerCardProps {
  segmentDistance: number;
  accumulatedDistance: number;
  previousPointType: 'hotel' | 'gcp' | 'none';
  previousPointLabel: string;
  currentGcpId: string;
  initialBearing?: number;
  onResetSession: () => void;
}

export const DistanceTrackerCard: React.FC<DistanceTrackerCardProps> = ({
  segmentDistance,
  accumulatedDistance,
  previousPointType,
  previousPointLabel,
  currentGcpId,
  initialBearing,
  onResetSession,
}) => {
  return (
    <div className="bg-slate-900 text-white rounded-xl border border-slate-800 shadow-md p-4 sm:p-5 relative overflow-hidden">
      {/* Subtle background grid pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              Point-to-Point Distance Tracker
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                WGS-84 Geodesic
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Automatic tracking: Hotel → GCP 1 → GCP 2 → Next GCP
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetSession}
          title="Reset session distance accumulator"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Day</span>
        </button>
      </div>

      {/* Primary Distance Readouts (Segment vs Accumulated) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 relative z-10">
        {/* Current Segment Card */}
        <div className="bg-slate-800/90 rounded-xl p-3.5 border border-slate-700/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium flex items-center gap-1 text-sky-300">
              <ArrowRight className="w-3.5 h-3.5" />
              Current Segment Distance
            </span>
            {initialBearing !== undefined && initialBearing > 0 && (
              <span className="font-mono text-[10px] text-slate-400">
                Azimuth: {initialBearing.toFixed(1)}°
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
            {segmentDistance > 0 ? formatDistance(segmentDistance) : '0.00 m'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 truncate">
            <span>Leg:</span>
            <span className="text-slate-300 font-medium truncate">{previousPointLabel}</span>
            <span>→</span>
            <span className="text-sky-300 font-bold">{currentGcpId || 'GCP'}</span>
          </div>
        </div>

        {/* Accumulated Total Distance Card */}
        <div className="bg-slate-800/90 rounded-xl p-3.5 border border-slate-700/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium flex items-center gap-1 text-emerald-300">
              <TrendingUp className="w-3.5 h-3.5" />
              Total Accumulated Distance
            </span>
            <span className="text-[10px] text-slate-400">Today&apos;s Survey</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
            {accumulatedDistance > 0 ? formatDistance(accumulatedDistance) : '0.00 m'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Stored locally in SQLite database and included in CSV export.
          </div>
        </div>
      </div>

      {/* Visual Point-to-Point Survey Chain Step Ribbon */}
      <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800 relative z-10">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
          <span>Survey Tracking Chain</span>
          <span className="text-[10px] text-slate-400 lowercase font-mono">
            {previousPointType === 'hotel'
              ? 'first gcp leg'
              : previousPointType === 'gcp'
              ? 'continuous point chain'
              : 'waiting for gps capture'}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {/* Origin / Hotel Point */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
            <Hotel className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-slate-200">Base Hotel</span>
          </div>

          <div className="flex items-center gap-1 text-slate-500 shrink-0">
            <div className="w-6 h-[1.5px] bg-slate-700" />
            <ArrowRight className="w-3 h-3 text-slate-500" />
          </div>

          {/* Previous or Current Target */}
          {previousPointType === 'gcp' ? (
            <>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-mono text-slate-200">{previousPointLabel}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 shrink-0">
                <div className="w-6 h-[1.5px] bg-blue-500" />
                <ArrowRight className="w-3 h-3 text-blue-400" />
              </div>
            </>
          ) : null}

          {/* Active Target Point */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/30 border border-blue-500/50 text-white shrink-0 shadow-xs">
            <Compass className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="font-bold font-mono">{currentGcpId || 'Next GCP'}</span>
            {segmentDistance > 0 && (
              <span className="font-mono text-[10px] text-sky-300 font-semibold ml-1">
                +{formatDistanceCompact(segmentDistance)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
