/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Trash2,
  Eye,
  MapPin,
  Calendar,
  Compass,
  ArrowRight,
  TrendingUp,
  Image as ImageIcon,
  CheckCircle2,
  Folder,
  FolderArchive,
  Layers,
  FileText,
  Timer,
  Clock,
  FolderTree,
  Laptop,
} from 'lucide-react';
import { GcpRecord, PointStatus } from '../types';
import { formatDistance, formatDistanceCompact } from '../utils/distance';
import { formatDMS } from '../utils/exif';
import { exportSingleGcpFolderZip } from '../utils/csv';

interface RecordsListProps {
  records: GcpRecord[];
  onDeleteRecord: (id: string) => Promise<void>;
  onExportCsv: () => void;
  onExportXls: () => void;
  onExportZipFolders: () => void;
  onExportGeoJson: () => void;
  onSelectRecordForPath?: (record: GcpRecord) => void;
  onOpenLaptopSync?: () => void;
}

export const RecordsList: React.FC<RecordsListProps> = ({
  records,
  onDeleteRecord,
  onExportCsv,
  onExportXls,
  onExportZipFolders,
  onExportGeoJson,
  onSelectRecordForPath,
  onOpenLaptopSync,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PointStatus>('all');
  const [selectedRecord, setSelectedRecord] = useState<GcpRecord | null>(null);
  const [isDownloadingSingleFolder, setIsDownloadingSingleFolder] = useState(false);

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.gcpId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.operatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.surveyMode && r.surveyMode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.stationType && r.stationType.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate summary metrics
  const totalPoints = records.length;
  const totalAccumulated =
    records.length > 0
      ? records.reduce((max, r) => Math.max(max, r.accumulatedDistanceMeters), 0)
      : 0;
  const normalCount = records.filter((r) => r.status === 'normal').length;
  const abnormalCount = records.filter((r) => r.status === 'abnormal').length;
  const redoCount = records.filter((r) => r.status === 'redo').length;

  const handleDownloadSingleFolder = async (record: GcpRecord) => {
    setIsDownloadingSingleFolder(true);
    try {
      await exportSingleGcpFolderZip(record);
    } finally {
      setIsDownloadingSingleFolder(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">Total Saved Points</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-0.5">
            {totalPoints}
          </div>
          <span className="text-[11px] text-slate-500">In Local SQLite / IndexedDB</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">Total Distance Traveled</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 mt-0.5">
            {formatDistanceCompact(totalAccumulated)}
          </div>
          <span className="text-[11px] text-slate-500">Across All Survey Legs</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">Status Breakdown</span>
          <div className="text-base font-bold font-mono text-slate-900 mt-0.5 flex items-center gap-2">
            <span className="text-emerald-600">{normalCount} Norm</span>
            <span className="text-slate-300">/</span>
            <span className="text-amber-600">{abnormalCount} Abn</span>
            {redoCount > 0 && (
              <>
                <span className="text-slate-300">/</span>
                <span className="text-red-600">{redoCount} Redo</span>
              </>
            )}
          </div>
          <span className="text-[11px] text-slate-500">Survey Quality Distribution</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] text-slate-500 font-medium">Export Survey Files</span>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {onOpenLaptopSync && (
              <button
                type="button"
                onClick={onOpenLaptopSync}
                className="py-1 px-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                title="Connect to Laptop via USB, Wi-Fi Hotspot, or Bluetooth"
              >
                <Laptop className="w-3 h-3" />
                <span>Laptop Connect</span>
              </button>
            )}
            <button
              type="button"
              onClick={onExportZipFolders}
              className="py-1 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs"
              title="Download all photos organized into individual folders per GCP ID"
            >
              <FolderArchive className="w-3 h-3" />
              <span>GCP Folders (.zip)</span>
            </button>
            <button
              type="button"
              onClick={onExportXls}
              className="py-1 px-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs"
              title="Export as Microsoft Excel XLS Spreadsheet"
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span>XLS</span>
            </button>
            <button
              type="button"
              onClick={onExportCsv}
              className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold flex items-center gap-1"
              title="Export CSV for USB Transfer"
            >
              <FileText className="w-3 h-3" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by GCP ID, project, city, survey mode, or operator..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter segmented control */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('normal')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'normal'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Normal ({normalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('abnormal')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'abnormal'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Abnormal ({abnormalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('redo')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'redo'
                ? 'bg-white text-red-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Redo ({redoCount})
          </button>
        </div>
      </div>

      {/* Records List Feed */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          <Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No records found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {records.length === 0
              ? 'Start surveying and save points from the Survey Form tab.'
              : 'Try clearing your search query or status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRecords.map((r) => {
            const photoCount = r.photos ? Object.keys(r.photos).length : 0;
            const statusColor =
              r.status === 'normal'
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : r.status === 'abnormal'
                ? 'text-amber-700 bg-amber-50 border-amber-200'
                : 'text-red-700 bg-red-50 border-red-200';

            const stationBadge =
              r.stationType === 'base'
                ? 'bg-purple-100 text-purple-800 border-purple-200'
                : r.stationType === 'check_point'
                ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
                : 'bg-blue-100 text-blue-800 border-blue-200';

            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 hover:border-blue-300 transition-all shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  {/* Title & Metadata (Zero-pill text separators per skill rules) */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 font-mono">
                        {r.gcpId}
                      </h3>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${stationBadge}`}>
                        {r.stationType?.toUpperCase() || 'GCP'}
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {r.surveyMode?.toUpperCase() || 'RTK'}
                      </span>
                      <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                        Mark: {r.pointMarkType?.toUpperCase() || 'NAIL'}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${statusColor}`}>
                        {r.status}
                      </span>
                      {r.totalObservationTime && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                          <Timer className="w-3 h-3 text-blue-600" />
                          Obs: {r.totalObservationTime}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <span className="font-mono text-blue-700 flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                        <Folder className="w-3 h-3 text-amber-500 inline" />
                        {r.folderPath || `${r.gcpId}/`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{r.projectName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{r.operatorName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{r.date}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(r)}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details & Photos ({photoCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteRecord(r.id)}
                      title="Delete record"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Point Coordinates, Distance Tracking & Observation Timing Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
                  {/* Coordinates */}
                  <div className="font-mono text-slate-700">
                    <span className="text-[11px] text-slate-400 block font-sans">Coordinates</span>
                    <span>{r.latitude.toFixed(6)}°, {r.longitude.toFixed(6)}°</span>
                    <span className="text-[10px] text-slate-400 block font-sans">
                      Antenna: {r.antennaHeight.toFixed(3)}m
                    </span>
                  </div>

                  {/* Observation Timing */}
                  <div>
                    <span className="text-[11px] text-slate-400 block">Observation Time</span>
                    <span className="font-mono font-bold text-sky-700">
                      {r.totalObservationTime || 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {r.startTime ? `${r.startTime.split(' ')[1] || r.startTime} ➔ ${r.endTime ? (r.endTime.split(' ')[1] || r.endTime) : ''}` : 'One-shot GNSS'}
                    </span>
                  </div>

                  {/* Segment Distance */}
                  <div>
                    <span className="text-[11px] text-slate-400 block">Segment Distance</span>
                    <span className="font-mono font-bold text-blue-600">
                      {formatDistance(r.segmentDistanceMeters)}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      From {r.prevPointId || 'Initial Reference'}
                    </span>
                  </div>

                  {/* Accumulated Total Distance */}
                  <div>
                    <span className="text-[11px] text-slate-400 block">Accumulated Total</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {formatDistance(r.accumulatedDistanceMeters)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Session Total to point
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Inspection Modal with all Photos and EXIF view */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold font-mono">
                    GCP: {selectedRecord.gcpId}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-blue-600 text-white">
                    {selectedRecord.stationType?.toUpperCase() || 'GCP'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-800 text-slate-300">
                    {selectedRecord.surveyMode?.toUpperCase() || 'RTK'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-amber-400 inline" />
                  <span>Folder: {selectedRecord.folderPath || `${selectedRecord.gcpId}/`}</span>
                  <span>•</span>
                  <span>{selectedRecord.projectName}</span>
                  <span>•</span>
                  <span>{selectedRecord.city}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSingleFolder(selectedRecord)}
                  disabled={isDownloadingSingleFolder}
                  className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloadingSingleFolder ? 'Zipping...' : 'Download Folder (.zip)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Hierarchical Folder Structure Banner */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-1">
                  <FolderTree className="w-4 h-4 text-amber-600" />
                  <span>4-Level Directory Hierarchy: [Project] / [Operator] / [Date] / [GCP ID] /</span>
                </div>
                <div className="font-mono text-xs text-amber-950 bg-white/80 p-2 rounded border border-amber-200/60 break-all select-all">
                  📁 {selectedRecord.folderPath || `${selectedRecord.projectName || 'Project'}/${selectedRecord.operatorName || 'Operator'}/${selectedRecord.date || 'Date'}/${selectedRecord.gcpId}/`}
                </div>
              </div>

              {/* Survey Metadata & Observation Timing Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Survey Mode</span>
                  <span className="font-bold text-blue-900 uppercase">
                    {selectedRecord.surveyMode || 'RTK'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Station Role</span>
                  <span className="font-bold text-blue-900 uppercase">
                    {selectedRecord.stationType === 'base' ? 'Base Station' : selectedRecord.stationType === 'check_point' ? 'Check Point' : selectedRecord.stationType === 'tbm' ? 'TBM Benchmark' : 'GCP (Ground Control)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Point Mark Type</span>
                  <span className="font-bold text-blue-900 uppercase">
                    {selectedRecord.pointMarkType?.replace('_', ' ') || 'Nail'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Antenna Height</span>
                  <span className="font-bold font-mono text-blue-900">
                    {selectedRecord.antennaHeight.toFixed(3)} m
                  </span>
                </div>

                <div className="pt-2 border-t border-blue-200/60">
                  <span className="text-slate-500 block text-[11px]">GCP Start Time</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedRecord.startTime || 'Instant'}
                  </span>
                </div>
                <div className="pt-2 border-t border-blue-200/60">
                  <span className="text-slate-500 block text-[11px]">GCP End Time</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedRecord.endTime || selectedRecord.startTime || 'Instant'}
                  </span>
                </div>
                <div className="pt-2 border-t border-blue-200/60 col-span-2">
                  <span className="text-slate-500 block text-[11px]">Total Observation Duration</span>
                  <span className="font-mono font-bold text-emerald-700 flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-emerald-600 inline" />
                    {selectedRecord.totalObservationTime || 'Instantaneous GNSS capture'}
                  </span>
                </div>
              </div>

              {/* Coordinates Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block font-sans">Decimal Lat/Lon</span>
                  <span className="font-bold text-slate-900 block truncate">
                    {selectedRecord.latitude.toFixed(7)}°
                  </span>
                  <span className="font-bold text-slate-900 block truncate">
                    {selectedRecord.longitude.toFixed(7)}°
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">DMS Lat/Lon</span>
                  <span className="text-slate-700 block truncate">
                    {formatDMS(selectedRecord.latitude, true)}
                  </span>
                  <span className="text-slate-700 block truncate">
                    {formatDMS(selectedRecord.longitude, false)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Segment Dist</span>
                  <span className="font-bold text-blue-600 block">
                    {formatDistance(selectedRecord.segmentDistanceMeters)}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-sans truncate">
                    Ref: {selectedRecord.prevPointId || 'Base Hotel'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Accumulated Day Total</span>
                  <span className="font-bold text-emerald-600 block">
                    {formatDistance(selectedRecord.accumulatedDistanceMeters)}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-sans">
                    Station Status: {selectedRecord.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Photos Gallery */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      Photos in Folder: &ldquo;{selectedRecord.folderPath || `${selectedRecord.gcpId}/`}&rdquo; (
                      {selectedRecord.photos ? Object.keys(selectedRecord.photos).length : 0} photos)
                    </span>
                  </h4>
                </div>

                {selectedRecord.photos && Object.keys(selectedRecord.photos).length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {Object.entries(selectedRecord.photos).map(([key, photo]) => {
                      if (!photo?.dataUrl) return null;
                      return (
                        <div
                          key={key}
                          className="rounded-lg overflow-hidden border border-slate-200 bg-black aspect-4/3 relative group"
                        >
                          <img
                            src={photo.dataUrl}
                            alt={photo.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-2 text-white text-[11px]">
                            <span className="font-bold leading-tight truncate">{photo.title}</span>
                            <span className="text-[9px] text-amber-300 font-mono truncate">
                              {photo.filename || `${photo.title}.jpg`}
                            </span>
                            <span className="text-[8px] text-emerald-400 font-mono">
                              EXIF GPS Tagged
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No photos attached for this point.</p>
                )}
              </div>

              {/* Notes */}
              {selectedRecord.notes && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                  <span className="font-semibold block">Field Notes:</span>
                  <p className="mt-0.5">{selectedRecord.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-mono">Storage ID: {selectedRecord.id}</span>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
