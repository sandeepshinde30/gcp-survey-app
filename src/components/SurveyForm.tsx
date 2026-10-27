/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Save,
  CheckCircle2,
  Calendar,
  Briefcase,
  MapPin,
  User,
  Hash,
  Ruler,
  AlertCircle,
  Sparkles,
  Clock,
  Timer,
  FolderTree,
  Folder,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { PointStatus, SurveyMode, StationType, PointMarkType, GpsCoordinates, PhotoType, PhotoInfo, GcpRecord } from '../types';
import { GpsLocationCard } from './GpsLocationCard';
import { DistanceTrackerCard } from './DistanceTrackerCard';
import { PhotoGrid } from './PhotoGrid';

interface SurveyFormProps {
  hotelLocation: GpsCoordinates | null;
  currentGcpLocation: GpsCoordinates | null;
  segmentDistance: number;
  accumulatedDistance: number;
  previousPointType: 'hotel' | 'gcp' | 'none';
  previousPointLabel: string;
  onCaptureHotel: (coords: GpsCoordinates) => void;
  onCaptureGcp: (coords: GpsCoordinates) => void;
  onResetSession: () => void;
  onSaveRecord: (record: GcpRecord) => Promise<void>;
}

export const SurveyForm: React.FC<SurveyFormProps> = ({
  hotelLocation,
  currentGcpLocation,
  segmentDistance,
  accumulatedDistance,
  previousPointType,
  previousPointLabel,
  onCaptureHotel,
  onCaptureGcp,
  onResetSession,
  onSaveRecord,
}) => {
  // Form fields
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);
  const [projectName, setProjectName] = useState<string>('Highway NH-48 Expansion Survey');
  const [city, setCity] = useState<string>('Pune');
  const [operatorName, setOperatorName] = useState<string>('Rajesh Sharma');
  const [gcpId, setGcpId] = useState<string>('GCP-001');
  const [pointStatus, setPointStatus] = useState<PointStatus>('normal');
  const [surveyMode, setSurveyMode] = useState<SurveyMode>('rtk');
  const [stationType, setStationType] = useState<StationType>('gcp');
  const [pointMarkType, setPointMarkType] = useState<PointMarkType>('nail');
  const [antennaHeight, setAntennaHeight] = useState<string>('1.80');
  const [notes, setNotes] = useState<string>('');

  // Observation Timing state
  const getCurrentFormattedTime = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const [startTime, setStartTime] = useState<string>(getCurrentFormattedTime);
  const [startTimestamp, setStartTimestamp] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isObserving, setIsObserving] = useState<boolean>(true);

  // Live timer tick
  React.useEffect(() => {
    if (!isObserving) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimestamp) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isObserving, startTimestamp]);

  const handleStartObservation = () => {
    const now = Date.now();
    setStartTimestamp(now);
    setStartTime(getCurrentFormattedTime());
    setElapsedSeconds(0);
    setIsObserving(true);
  };

  const handleToggleObservation = () => {
    setIsObserving((prev) => !prev);
  };

  const formatElapsed = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  };

  // Photos state for current GCP
  const [photos, setPhotos] = useState<Partial<Record<PhotoType, PhotoInfo>>>({});

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const handlePhotoCaptured = (info: PhotoInfo) => {
    setPhotos((prev) => ({
      ...prev,
      [info.type]: info,
    }));
  };

  const handlePhotoRemoved = (type: PhotoType) => {
    setPhotos((prev) => {
      const copy = { ...prev };
      delete copy[type];
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccessMessage(null);

    // Validations
    if (!gcpId.trim()) {
      setErrorMessage('GCP ID is required.');
      return;
    }
    if (!currentGcpLocation) {
      setErrorMessage('Please capture GCP Location before saving the record.');
      return;
    }
    const heightNum = parseFloat(antennaHeight);
    if (isNaN(heightNum) || heightNum <= 0) {
      setErrorMessage('Please enter a valid antenna height in meters (e.g. 1.80).');
      return;
    }

    setIsSubmitting(true);
    try {
      const newAccumulated = accumulatedDistance + segmentDistance;
      const cleanGcp = gcpId.trim();

      // End time is captured at moment of save
      const nowFormatted = getCurrentFormattedTime();
      const durationSec = Math.max(elapsedSeconds, Math.floor((Date.now() - startTimestamp) / 1000));
      const durationFormatted = formatElapsed(durationSec);

      // 4-level Folder hierarchy: Project / Operator / Date / GCP ID /
      const cleanProject = projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Project';
      const cleanOperator = operatorName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Operator';
      const cleanDate = date.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Date';
      const folderPath = `${cleanProject}/${cleanOperator}/${cleanDate}/${cleanGcp}/`;

      const record: GcpRecord = {
        id: `gcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date,
        projectName,
        city,
        operatorName,
        gcpId: cleanGcp,
        status: pointStatus,
        surveyMode,
        stationType,
        pointMarkType,
        antennaHeight: heightNum,
        latitude: currentGcpLocation.latitude,
        longitude: currentGcpLocation.longitude,
        altitude: currentGcpLocation.altitude,
        accuracy: currentGcpLocation.accuracy,
        prevPointType: previousPointType,
        prevPointId: previousPointLabel,
        segmentDistanceMeters: segmentDistance,
        accumulatedDistanceMeters: newAccumulated,
        hotelLatitude: hotelLocation?.latitude || null,
        hotelLongitude: hotelLocation?.longitude || null,
        startTime,
        endTime: nowFormatted,
        totalObservationTime: durationFormatted,
        observationDurationSeconds: durationSec,
        folderPath,
        folderHierarchy: {
          projectName: cleanProject,
          operatorName: cleanOperator,
          date: cleanDate,
          gcpId: cleanGcp,
        },
        photos: { ...photos },
        createdAt: new Date().toISOString(),
        notes: notes.trim(),
      };

      await onSaveRecord(record);

      const photosCount = Object.keys(photos).length;
      setSaveSuccessMessage(
        `Successfully saved ${cleanGcp}! Obs Time: ${durationFormatted} (from ${startTime} to ${nowFormatted}). Folder: "${folderPath}" with ${photosCount} photos.`
      );
      // Reset photos for next point
      setPhotos({});

      // Reset observation timer for next point
      handleStartObservation();

      // Auto-increment GCP ID: GCP-001 -> GCP-002
      const match = gcpId.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        const prefix = gcpId.substring(0, match.index);
        const nextNum = (num + 1).toString().padStart(match[1].length, '0');
        setGcpId(`${prefix}${nextNum}`);
      } else {
        setGcpId(`${gcpId}-Next`);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to save record to local database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {/* Notifications */}
      {saveSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">{saveSuccessMessage}</p>
            <p className="text-emerald-700">Point distance recorded in survey chain.</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl flex items-center gap-2.5 text-xs text-red-900 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Point-to-Point Distance Tracking Banner */}
      <DistanceTrackerCard
        segmentDistance={segmentDistance}
        accumulatedDistance={accumulatedDistance}
        previousPointType={previousPointType}
        previousPointLabel={previousPointLabel}
        currentGcpId={gcpId}
        onResetSession={onResetSession}
      />

      {/* GPS Location Capture (Hotel & GCP Location) */}
      <GpsLocationCard
        hotelLocation={hotelLocation}
        currentGcpLocation={currentGcpLocation}
        onCaptureHotel={onCaptureHotel}
        onCaptureGcp={onCaptureGcp}
      />

      {/* 4-Level Folder Structure & GNSS Observation Timer Banner */}
      <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-4 sm:p-5 shadow-sm space-y-3.5">
        {/* Dynamic Folder Structure Preview */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <FolderTree className="w-4 h-4 text-amber-400" />
              Hierarchical Folder Structure (Project / Operator / Date / GCP)
            </span>
            <span className="text-[10px] text-amber-400 font-mono">Auto Organized</span>
          </div>
          <div className="p-2.5 bg-slate-950/90 rounded-lg border border-slate-800 text-xs font-mono flex flex-wrap items-center gap-1.5 text-slate-300">
            <span className="text-amber-400 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5" />
              {projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Project'}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-sky-400 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5" />
              {operatorName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Operator'}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5" />
              {date.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Date'}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-bold bg-blue-600/30 px-1.5 py-0.5 rounded border border-blue-500/40 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-blue-400" />
              {gcpId.trim() || 'GCP-001'}
            </span>
          </div>
        </div>

        {/* Observation Timing (Start Time, Running Timer, End Time Preview) */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
              GCP Start Time
            </span>
            <span className="text-xs font-mono font-bold text-sky-400 mt-0.5 block truncate">
              {startTime}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider flex items-center gap-1">
                <Timer className="w-3 h-3 text-emerald-400" />
                Observation Duration
              </span>
              <span className="text-lg font-mono font-bold text-emerald-400 tracking-tight">
                {formatElapsed(elapsedSeconds)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleObservation}
                title={isObserving ? 'Pause observation timer' : 'Resume observation timer'}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {isObserving ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
              <button
                type="button"
                onClick={handleStartObservation}
                title="Restart observation timing from zero"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
              GCP End Time
            </span>
            <span className="text-xs font-mono text-slate-300 mt-0.5 block truncate">
              {isObserving ? 'Auto-recorded upon Save' : 'Observation Paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Core Survey Form Fields */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span>Survey Form Metadata</span>
          <span className="text-xs text-slate-400 font-normal">Fields matching survey log</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {/* GCP ID (Prominent) */}
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-blue-600" />
              GCP ID *
            </label>
            <input
              type="text"
              required
              value={gcpId}
              onChange={(e) => setGcpId(e.target.value)}
              placeholder="e.g. GCP-001"
              className="w-full px-3 py-2 text-sm font-mono font-bold text-blue-900 bg-blue-50/40 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
            />
          </div>

          {/* Station Role (Base vs GCP) */}
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Station Role *
            </label>
            <select
              value={stationType}
              onChange={(e) => setStationType(e.target.value as StationType)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden font-medium text-slate-800"
            >
              <option value="gcp">GCP (Rover / Control Point)</option>
              <option value="base">Base Station (Reference GNSS)</option>
              <option value="check_point">Check Point (QA/QC Validation)</option>
              <option value="tbm">TBM (Temporary Bench Mark)</option>
            </select>
          </div>

          {/* Mode of Survey */}
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mode of Survey (Survey Type) *
            </label>
            <select
              value={surveyMode}
              onChange={(e) => setSurveyMode(e.target.value as SurveyMode)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden font-medium text-slate-800"
            >
              <option value="rtk">RTK (Real-Time Kinematic)</option>
              <option value="static">Static Survey (High Precision)</option>
              <option value="ppk">PPK (Post-Processed Kinematic)</option>
              <option value="stop_and_go">Stop & Go Kinematic</option>
              <option value="dgps">DGPS (Differential GPS)</option>
              <option value="fast_static">Fast Static</option>
            </select>
          </div>

          {/* Point Ground Mark Type */}
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Point Mark Type (Neal, Mark, etc.) *
            </label>
            <select
              value={pointMarkType}
              onChange={(e) => setPointMarkType(e.target.value as PointMarkType)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden font-medium text-slate-800"
            >
              <option value="nail">Nail / PK Nail / Steel Spike</option>
              <option value="paint_mark">Paint Mark / Spray Cross</option>
              <option value="chisel_cross">Chiseled Cross / Cut Mark</option>
              <option value="peg">Wooden Peg with Center Tack</option>
              <option value="rebar_cap">Rebar with Aluminum Cap</option>
              <option value="other">Other Ground Benchmark</option>
            </select>
          </div>

          {/* Point Status Dropdown */}
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Point Status *
            </label>
            <select
              value={pointStatus}
              onChange={(e) => setPointStatus(e.target.value as PointStatus)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden font-medium text-slate-800"
            >
              <option value="normal">NORMAL (Valid & Stable)</option>
              <option value="abnormal">ABNORMAL (Obstruction / Slope)</option>
              <option value="redo">REDO (Disturbed / Re-measurement)</option>
            </select>
          </div>

          {/* Antenna Height (meters) */}
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5 text-slate-500" />
              Antenna Height (meters) *
            </label>
            <input
              type="number"
              step="0.001"
              required
              value={antennaHeight}
              onChange={(e) => setAntennaHeight(e.target.value)}
              placeholder="1.800"
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
            />
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              Project Name
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Metro Rail Corridor"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              City
            </label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Pune"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
            />
          </div>

          {/* Operator Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" />
              Operator Name
            </label>
            <input
              type="text"
              required
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="e.g. Rajesh Sharma"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Survey Field Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Point set on concrete pavement, good sky view"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Camera Geotagging Section (4 side + 3 equipment photos) */}
      <PhotoGrid
        photos={photos}
        onPhotoCaptured={handlePhotoCaptured}
        onPhotoRemoved={handlePhotoRemoved}
        gcpId={gcpId}
        projectName={projectName}
        antennaHeight={parseFloat(antennaHeight) || 1.8}
        operatorName={operatorName}
        currentGps={currentGcpLocation}
      />

      {/* Primary Action Button (Fixed or Sticky bottom in mobile ergonomics) */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-13 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>Save GCP Record to Local SQLite Database</span>
        </button>
        <p className="text-center text-[11px] text-slate-500 mt-2">
          Stored locally in phone storage (100% offline, no internet required)
        </p>
      </div>
    </form>
  );
};
