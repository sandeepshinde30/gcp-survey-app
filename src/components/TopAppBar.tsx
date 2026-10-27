/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Smartphone,
  Laptop,
  CheckCircle2,
  HardDrive,
  Code2,
  MapPin,
  ListOrdered,
  Route,
  BatteryCharging,
} from 'lucide-react';
import { formatDistanceCompact } from '../utils/distance';

interface TopAppBarProps {
  activeTab: 'survey' | 'records' | 'path' | 'kotlin';
  setActiveTab: (tab: 'survey' | 'records' | 'path' | 'kotlin') => void;
  isMobileFrame: boolean;
  setIsMobileFrame: (val: boolean) => void;
  recordCount: number;
  accumulatedDistance: number;
  onExportCsv: () => void;
  onExportXls: () => void;
  onExportZipFolders: () => void;
  onDownloadAndroidZip: () => void;
  onOpenLaptopSync: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  activeTab,
  setActiveTab,
  isMobileFrame,
  setIsMobileFrame,
  recordCount,
  accumulatedDistance,
  onExportCsv,
  onExportXls,
  onExportZipFolders,
  onDownloadAndroidZip,
  onOpenLaptopSync,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm sticky top-0 z-30">
      {/* Primary Brand & Actions Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
                GCP Survey Tracker
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <HardDrive className="w-3 h-3" />
                Offline SQLite
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <BatteryCharging className="w-3 h-3" />
                Balanced GPS
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              WGS-84 Point-to-Point Distance & EXIF Geotagging
            </p>
          </div>
        </div>

        {/* Global Stats & Quick Export Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {accumulatedDistance > 0 && (
            <div className="hidden lg:flex flex-col items-end px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/60 text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Session Distance</span>
              <span className="text-xs font-mono font-bold text-sky-400">
                {formatDistanceCompact(accumulatedDistance)}
              </span>
            </div>
          )}

          {/* Device Frame Viewport Toggle */}
          <button
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            title={isMobileFrame ? "Switch to Wide Surveyor Console" : "Switch to Android Mobile Device View"}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          >
            {isMobileFrame ? (
              <>
                <Laptop className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Wide</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Phone</span>
              </>
            )}
          </button>

          {/* Laptop Connect & Transfer Hub (USB / Wi-Fi Hotspot / Bluetooth) */}
          <button
            onClick={onOpenLaptopSync}
            title="Connect with Laptop via USB Cable, Wi-Fi Hotspot (Browser), or Bluetooth"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-xs"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Laptop Connect</span>
          </button>

          {/* Export GCP Folders ZIP */}
          <button
            onClick={onExportZipFolders}
            title="Download GCP photos organized in folders per GCP number"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">GCP Folders (.zip)</span>
          </button>

          {/* Export XLS */}
          <button
            onClick={onExportXls}
            title="Export as Microsoft Excel (.xls) file with coordinates & metadata"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">XLS</span>
          </button>

          {/* Export CSV for USB Transfer */}
          <button
            onClick={onExportCsv}
            title="Export CSV for laptop USB transfer"
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
          >
            <span className="whitespace-nowrap">CSV</span>
          </button>

          {/* Download Kotlin Project ZIP */}
          <button
            onClick={onDownloadAndroidZip}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Android ZIP</span>
          </button>
        </div>
      </div>

      {/* Material 3 Segmented Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex space-x-1 sm:space-x-2 border-t border-slate-800/80 pt-1 pb-1">
          <button
            onClick={() => setActiveTab('survey')}
            className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
              activeTab === 'survey'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Survey Form</span>
          </button>

          <button
            onClick={() => setActiveTab('records')}
            className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
              activeTab === 'records'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Records</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'records' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {recordCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('path')}
            className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
              activeTab === 'path'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Route className="w-4 h-4" />
            <span>Point Tracker Path</span>
          </button>

          <button
            onClick={() => setActiveTab('kotlin')}
            className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
              activeTab === 'kotlin'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span>Kotlin & Compose Code</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
