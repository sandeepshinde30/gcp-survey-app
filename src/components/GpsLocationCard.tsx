/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Navigation,
  Hotel,
  Compass,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { GpsCoordinates } from '../types';
import { formatDMS } from '../utils/exif';

interface GpsLocationCardProps {
  hotelLocation: GpsCoordinates | null;
  currentGcpLocation: GpsCoordinates | null;
  onCaptureHotel: (coords: GpsCoordinates) => void;
  onCaptureGcp: (coords: GpsCoordinates) => void;
}

export const GpsLocationCard: React.FC<GpsLocationCardProps> = ({
  hotelLocation,
  currentGcpLocation,
  onCaptureHotel,
  onCaptureGcp,
}) => {
  const [loadingTarget, setLoadingTarget] = useState<'hotel' | 'gcp' | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showSimControls, setShowSimControls] = useState(false);

  // Default initial coordinates (Pune survey corridor or user's current area)
  const defaultBaseLat = 18.52043;
  const defaultBaseLon = 73.85674;

  const capturePosition = (target: 'hotel' | 'gcp') => {
    setLoadingTarget(target);
    setPermissionError(null);

    if (!('geolocation' in navigator)) {
      setPermissionError('Geolocation is not supported by your device browser.');
      setLoadingTarget(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: GpsCoordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracy: Math.round(pos.coords.accuracy * 10) / 10,
          timestamp: pos.timestamp || Date.now(),
          provider: 'BALANCED_POWER_GPS',
        };

        if (target === 'hotel') {
          onCaptureHotel(coords);
        } else {
          onCaptureGcp(coords);
        }
        setLoadingTarget(null);
      },
      (err) => {
        console.warn('Geolocation error or permission denied:', err.message);
        // Fallback for indoor / non-https / denied testing: provide realistic field coordinate
        let msg = 'ACCESS_FINE_LOCATION permission needed.';
        if (err.code === 1) {
          msg = 'Location permission denied by user. You can also use Field Sim below.';
        } else if (err.code === 2) {
          msg = 'GPS signal unavailable indoors. Using field survey simulator coordinates.';
        }
        setPermissionError(msg);

        // Offer mock surveyor coordinate so user can still test seamlessly
        const baseLat = target === 'hotel' ? defaultBaseLat : (hotelLocation?.latitude || defaultBaseLat) + 0.0012;
        const baseLon = target === 'hotel' ? defaultBaseLon : (hotelLocation?.longitude || defaultBaseLon) + 0.0015;
        const mockCoords: GpsCoordinates = {
          latitude: baseLat,
          longitude: baseLon,
          altitude: 560.4,
          accuracy: 5.2,
          timestamp: Date.now(),
          provider: 'BALANCED_SIMULATED',
        };

        if (target === 'hotel') {
          onCaptureHotel(mockCoords);
        } else {
          onCaptureGcp(mockCoords);
        }
        setLoadingTarget(null);
      },
      {
        // Battery optimization rule: PRIORITY_BALANCED_POWER_ACCURACY
        // Disables battery-draining continuous high-accuracy hardware; fires one-shot only on button tap
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 15000,
      }
    );
  };

  // Helper to step GCP coordinates by offset for indoor testing
  const simulateStep = (deltaMetersNorth: number, deltaMetersEast: number) => {
    const startLat = currentGcpLocation?.latitude || hotelLocation?.latitude || defaultBaseLat;
    const startLon = currentGcpLocation?.longitude || hotelLocation?.longitude || defaultBaseLon;

    // 1 deg lat ≈ 111,320m; 1 deg lon ≈ 111,320 * cos(lat)
    const latOffset = deltaMetersNorth / 111320;
    const lonOffset = deltaMetersEast / (111320 * Math.cos((startLat * Math.PI) / 180));

    const steppedCoords: GpsCoordinates = {
      latitude: startLat + latOffset,
      longitude: startLon + lonOffset,
      altitude: (currentGcpLocation?.altitude || 550) + (Math.random() * 2 - 1),
      accuracy: 4.5,
      timestamp: Date.now(),
      provider: 'FIELD_STEP_SIM',
    };
    onCaptureGcp(steppedCoords);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">GPS Location Capture</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Battery Saver
              </span>
            </div>
            <p className="text-xs text-slate-500">
              One-shot balanced power accuracy • No continuous background drain
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSimControls(!showSimControls)}
          className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium transition-colors"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{showSimControls ? 'Hide Field Sim' : 'Field Sim'}</span>
        </button>
      </div>

      {permissionError && (
        <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">GPS Notice</p>
            <p className="text-amber-700">{permissionError}</p>
          </div>
        </div>
      )}

      {/* Main Dual Buttons: Hotel & GCP Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Hotel Location Button */}
        <button
          type="button"
          onClick={() => capturePosition('hotel')}
          disabled={loadingTarget !== null}
          className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border text-left transition-all ${
            hotelLocation
              ? 'border-emerald-300 bg-emerald-50/60 text-slate-900 shadow-xs'
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800'
          }`}
        >
          {loadingTarget === 'hotel' ? (
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
          ) : (
            <Hotel className={`w-5 h-5 ${hotelLocation ? 'text-emerald-600' : 'text-slate-600'}`} />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Base Reference
              </span>
              {hotelLocation && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                  LOCKED
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-900">Capture Hotel Location</p>
          </div>
        </button>

        {/* GCP Location Button */}
        <button
          type="button"
          onClick={() => capturePosition('gcp')}
          disabled={loadingTarget !== null}
          className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border text-left transition-all ${
            currentGcpLocation
              ? 'border-blue-400 bg-blue-50/60 text-slate-900 shadow-xs ring-1 ring-blue-400/40'
              : 'border-blue-600 bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
          }`}
        >
          {loadingTarget === 'gcp' ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          ) : (
            <Compass className={`w-5 h-5 ${currentGcpLocation ? 'text-blue-600' : 'text-white'}`} />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${currentGcpLocation ? 'text-blue-700' : 'text-blue-100'}`}>
                2. Survey Point
              </span>
              {currentGcpLocation && (
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                  ACTIVE
                </span>
              )}
            </div>
            <p className={`text-sm font-semibold ${currentGcpLocation ? 'text-slate-900' : 'text-white'}`}>
              Capture GCP Location
            </p>
          </div>
        </button>
      </div>

      {/* Captured Coordinates Summary Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Hotel Coordinates Block */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-slate-600 mb-1.5">
            <span className="font-semibold flex items-center gap-1 text-slate-700">
              <Hotel className="w-3.5 h-3.5 text-emerald-600" />
              Hotel Reference Point
            </span>
            {hotelLocation?.accuracy && (
              <span className="font-mono text-[10px] text-slate-500">±{hotelLocation.accuracy}m</span>
            )}
          </div>
          {hotelLocation ? (
            <div className="font-mono text-slate-800 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Latitude:</span>
                <span className="font-semibold text-slate-900">{hotelLocation.latitude.toFixed(6)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Longitude:</span>
                <span className="font-semibold text-slate-900">{hotelLocation.longitude.toFixed(6)}°</span>
              </div>
              <div className="text-[11px] text-slate-500 truncate pt-0.5">
                {formatDMS(hotelLocation.latitude, true)} {formatDMS(hotelLocation.longitude, false)}
              </div>
            </div>
          ) : (
            <p className="text-slate-400 italic text-[11px] py-1">
              Tap &quot;Capture Hotel Location&quot; at the start of your survey day.
            </p>
          )}
        </div>

        {/* Current GCP Coordinates Block */}
        <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between text-slate-600 mb-1.5">
            <span className="font-semibold flex items-center gap-1 text-blue-900">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              Current GCP Point
            </span>
            {currentGcpLocation?.accuracy && (
              <span className="font-mono text-[10px] text-blue-700 bg-blue-100 px-1 rounded">
                ±{currentGcpLocation.accuracy}m accuracy
              </span>
            )}
          </div>
          {currentGcpLocation ? (
            <div className="font-mono text-slate-800 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Latitude:</span>
                <span className="font-semibold text-blue-900">{currentGcpLocation.latitude.toFixed(6)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Longitude:</span>
                <span className="font-semibold text-blue-900">{currentGcpLocation.longitude.toFixed(6)}°</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600 pt-0.5">
                <span>Altitude: {currentGcpLocation.altitude ? `${currentGcpLocation.altitude.toFixed(1)}m` : 'N/A'}</span>
                <span>{currentGcpLocation.provider || 'GNSS'}</span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 italic text-[11px] py-1">
              Tap &quot;Capture GCP Location&quot; while positioned directly over the GCP peg.
            </p>
          )}
        </div>
      </div>

      {/* Field Testing Quick Stepper (Indoor / Demo Mode) */}
      {showSimControls && (
        <div className="mt-3 p-3 bg-slate-900 text-white rounded-lg text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              Simulate Field Movement (Indoor / Desk Testing)
            </span>
            <span className="text-[10px] text-slate-400">Advances GCP coordinate</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Quickly simulate walking to next GCP point to test distance tracking and accumulation without leaving your desk:
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => simulateStep(150, 0)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 font-mono text-[11px]"
            >
              +150m North
            </button>
            <button
              type="button"
              onClick={() => simulateStep(0, 220)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 font-mono text-[11px]"
            >
              +220m East
            </button>
            <button
              type="button"
              onClick={() => simulateStep(350, 200)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 font-mono text-[11px]"
            >
              +400m Northeast
            </button>
            <button
              type="button"
              onClick={() => simulateStep(-180, 0)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 font-mono text-[11px]"
            >
              +180m South
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
