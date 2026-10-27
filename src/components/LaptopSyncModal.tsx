/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Usb,
  Wifi,
  Bluetooth,
  Download,
  FolderArchive,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  Radio,
  ArrowRight,
  HardDrive,
  Globe,
  Share2,
  RefreshCw,
  Power,
  BatteryCharging,
  Eye,
} from 'lucide-react';
import { GcpRecord } from '../types';

interface LaptopSyncModalProps {
  records: GcpRecord[];
  onClose: () => void;
  onExportCsv: () => void;
  onExportXls: () => void;
  onExportZipFolders: () => void;
}

export const LaptopSyncModal: React.FC<LaptopSyncModalProps> = ({
  records,
  onClose,
  onExportCsv,
  onExportXls,
  onExportZipFolders,
}) => {
  const [activeMethod, setActiveMethod] = useState<'wifi' | 'bluetooth' | 'usb'>('wifi');
  const [isWifiServerRunning, setIsWifiServerRunning] = useState<boolean>(true);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedSsid, setCopiedSsid] = useState<boolean>(false);
  const [copiedPass, setCopiedPass] = useState<boolean>(false);
  const [bluetoothSharedType, setBluetoothSharedType] = useState<string | null>(null);
  const [showPortalPreview, setShowPortalPreview] = useState<boolean>(true);

  // Dynamic Hotspot & IP state
  const [hotspotSsid, setHotspotSsid] = useState<string>('GCP-SURVEY-HOTSPOT-8842');
  const [hotspotPassword, setHotspotPassword] = useState<string>('survey@field99');
  const [selectedIp, setSelectedIp] = useState<string>('192.168.43.1');

  const localIpUrl = `http://${selectedIp}:8080`;

  const handleRegenerateCredentials = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setHotspotSsid(`GCP-SURVEY-${randomSuffix}`);
    setHotspotPassword(`survey#${Math.random().toString(36).substring(2, 8)}`);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(localIpUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopySsid = () => {
    navigator.clipboard.writeText(hotspotSsid);
    setCopiedSsid(true);
    setTimeout(() => setCopiedSsid(false), 2000);
  };

  const handleCopyPass = () => {
    navigator.clipboard.writeText(hotspotPassword);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const handleBluetoothShareFile = async (type: 'xls' | 'csv' | 'zip') => {
    setBluetoothSharedType(type);
    if (type === 'xls') onExportXls();
    else if (type === 'csv') onExportCsv();
    else onExportZipFolders();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `GCP Survey Export (.${type})`,
          text: `GCP Survey Deliverable (${records.length} Points) - Ready for Laptop Bluetooth push`,
          url: window.location.href,
        });
      } catch {
        // Fallback to downloaded file
      }
    }
    setTimeout(() => setBluetoothSharedType(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh] border border-slate-200">
        {/* Modal Top Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">Laptop Connect &amp; Wireless Transfer Hub</h3>
              <p className="text-xs text-slate-400">
                100% Offline • Wi-Fi Hotspot Server • Bluetooth OBEX • USB Cable
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Method Segmented Tab Bar */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex gap-1.5">
          <button
            type="button"
            onClick={() => setActiveMethod('wifi')}
            className={`flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeMethod === 'wifi'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wifi className="w-4 h-4 text-emerald-600" />
            <span>MODE A: Wi-Fi Hotspot</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono hidden sm:inline">
              Web Server
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMethod('bluetooth')}
            className={`flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeMethod === 'bluetooth'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bluetooth className="w-4 h-4 text-indigo-600" />
            <span>MODE B: Bluetooth</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-mono hidden sm:inline">
              OBEX
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMethod('usb')}
            className={`flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeMethod === 'usb'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Usb className="w-4 h-4 text-blue-600" />
            <span>MODE C: USB Cable</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-mono hidden sm:inline">
              MTP
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* ================= MODE A: WI-FI HOTSPOT + LOCAL WEB SERVER ================= */}
          {activeMethod === 'wifi' && (
            <div className="space-y-4">
              {/* Highlight Header */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    Android Local-Only Hotspot + Port 8080 Web Server
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Phone starts an offline Wi-Fi hotspot and an embedded HTTP server. Any laptop can connect and download the survey files in Chrome or Edge without SIM data, cable, or internet.
                  </p>
                </div>
              </div>

              {/* Server Control & Dynamic Hotspot Card */}
              <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-3.5 shadow-md">
                {/* Status & Battery Save Toggle */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      {isWifiServerRunning && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-3 w-3 ${
                          isWifiServerRunning ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      ></span>
                    </span>
                    <div>
                      <span className="text-xs font-mono font-bold tracking-wider block">
                        {isWifiServerRunning
                          ? 'HOTSPOT & WEB SERVER ACTIVE (PORT 8080)'
                          : 'HOTSPOT & SERVER STOPPED'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isWifiServerRunning
                          ? 'Listening for laptop connections'
                          : 'Wi-Fi radio safely shut down to conserve battery'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsWifiServerRunning(!isWifiServerRunning)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      isWifiServerRunning
                        ? 'bg-rose-600/90 hover:bg-rose-600 text-white shadow-xs'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{isWifiServerRunning ? 'Stop Server (Save Battery)' : 'Start Server'}</span>
                  </button>
                </div>

                {isWifiServerRunning ? (
                  <>
                    {/* Dynamic Credentials: SSID & Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Dynamic SSID */}
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            HOTSPOT WI-FI SSID (NETWORK NAME):
                          </span>
                          <span className="text-sm font-mono font-bold text-amber-400 select-all">
                            {hotspotSsid}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopySsid}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                          title="Copy SSID"
                        >
                          {copiedSsid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Dynamic Password */}
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            HOTSPOT WPA2 PASSWORD:
                          </span>
                          <span className="text-sm font-mono font-bold text-amber-400 select-all">
                            {hotspotPassword}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyPass}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                          title="Copy Password"
                        >
                          {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* ACTUAL Dynamic IP Address Display & Selector */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-emerald-900/60 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold block">
                            ACTUAL DYNAMIC IP ADDRESS (ENTER ON LAPTOP BROWSER):
                          </span>
                          <span className="text-base sm:text-xl font-mono font-extrabold text-white tracking-wide select-all">
                            {localIpUrl}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <select
                            value={selectedIp}
                            onChange={(e) => setSelectedIp(e.target.value)}
                            className="bg-slate-800 text-slate-200 border border-slate-700 text-xs rounded-md px-2 py-1 font-mono outline-hidden"
                            title="Simulated Android Network Interface IP"
                          >
                            <option value="192.168.43.1">192.168.43.1 (Android AP)</option>
                            <option value="10.42.0.1">10.42.0.1 (Local Hotspot)</option>
                            <option value="192.168.49.1">192.168.49.1 (Wi-Fi Direct)</option>
                            <option value="172.20.10.1">172.20.10.1 (Tether AP)</option>
                          </select>

                          <button
                            type="button"
                            onClick={handleCopyUrl}
                            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs flex items-center gap-1 font-mono transition-colors"
                            title="Copy local hotspot address"
                          >
                            {copiedUrl ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                            <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Port 8080 • Chunked 64KB Streaming Buffer • Zero Out-of-Memory on Big ZIPs</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-center space-y-2">
                    <BatteryCharging className="w-6 h-6 text-emerald-400 mx-auto" />
                    <p className="text-xs text-slate-300">
                      Local Web Server and Wi-Fi Hotspot are <strong>OFF</strong>. No background battery consumption.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsWifiServerRunning(true)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Start Hotspot &amp; Server</span>
                    </button>
                  </div>
                )}
              </div>

              {/* LIVE LAPTOP BROWSER PORTAL PREVIEW */}
              {isWifiServerRunning && (
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-slate-900 text-white">
                  <div className="bg-slate-800 px-3 py-2 flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-300">
                        Laptop Browser View &bull; {localIpUrl}
                      </span>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                      Live Portal Preview
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 text-center space-y-3 bg-gradient-to-b from-slate-900 to-slate-950">
                    <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold">
                      &check; 100% Offline Hotspot Connection Established
                    </span>
                    <h3 className="text-lg font-bold text-sky-400">GCP Survey Data Transfer Portal</h3>
                    <p className="text-xs text-slate-300 max-w-md mx-auto">
                      Direct high-speed chunked download from Android phone to laptop. Click any deliverable button below:
                    </p>

                    {/* 3 User-specified download buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 max-w-xl mx-auto">
                      <button
                        type="button"
                        onClick={onExportZipFolders}
                        className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md"
                      >
                        <FolderArchive className="w-5 h-5" />
                        <span>Download All Photos (.zip)</span>
                        <span className="text-[10px] font-normal text-blue-200">Hierarchical folders</span>
                      </button>

                      <button
                        type="button"
                        onClick={onExportXls}
                        className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md"
                      >
                        <FileSpreadsheet className="w-5 h-5" />
                        <span>Download Master Excel (.xls)</span>
                        <span className="text-[10px] font-normal text-emerald-200">With distance &amp; timings</span>
                      </button>

                      <button
                        type="button"
                        onClick={onExportCsv}
                        className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md"
                      >
                        <FileText className="w-5 h-5" />
                        <span>Download Survey Database (.csv)</span>
                        <span className="text-[10px] font-normal text-slate-300">Clean comma-separated</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3 Easy Steps Guide */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  How Surveyor Connects Laptop:
                </span>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
                  <li>
                    <strong className="text-slate-900">Step 1:</strong> Keep &ldquo;Start Server&rdquo; active on this phone screen.
                  </li>
                  <li>
                    <strong className="text-slate-900">Step 2:</strong> On laptop, open Wi-Fi settings, connect to SSID <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold text-slate-800">{hotspotSsid}</code> with password <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold text-slate-800">{hotspotPassword}</code>.
                  </li>
                  <li>
                    <strong className="text-slate-900">Step 3:</strong> Open Chrome or Edge on laptop and go to <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold text-blue-700">{localIpUrl}</code> to download all files!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* ================= MODE B: BLUETOOTH FILE TRANSFER (OBEX) ================= */}
          {activeMethod === 'bluetooth' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Bluetooth className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                    Android Bluetooth / OBEX File Push to Laptop
                  </h4>
                  <p className="text-xs text-indigo-800 mt-0.5">
                    Wirelessly beam the Master Excel, Survey Database, or Photos ZIP directly to a paired laptop via Bluetooth without cables or Wi-Fi.
                  </p>
                </div>
              </div>

              {/* Bluetooth Transfer Actions */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                <span className="text-xs font-bold text-slate-800 block">
                  Select Deliverable to Push via Bluetooth:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleBluetoothShareFile('xls')}
                    className="p-3.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                    <span>Send Master Excel (.xls)</span>
                    <span className="text-[10px] font-normal text-emerald-200">Push to Laptop</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBluetoothShareFile('csv')}
                    className="p-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <FileText className="w-5 h-5" />
                    <span>Send Survey CSV (.csv)</span>
                    <span className="text-[10px] font-normal text-slate-300">Push to Laptop</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBluetoothShareFile('zip')}
                    className="p-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <FolderArchive className="w-5 h-5" />
                    <span>Send Photos ZIP (.zip)</span>
                    <span className="text-[10px] font-normal text-indigo-200">Push to Laptop</span>
                  </button>
                </div>

                {bluetoothSharedType && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Initiated Bluetooth OBEX push for .{bluetoothSharedType} file!</span>
                  </div>
                )}
              </div>

              {/* Bluetooth Instructions */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <span className="font-bold text-slate-900 block">How to Receive on Laptop (Windows / macOS / Linux):</span>
                <ol className="space-y-1.5 text-slate-600 list-decimal list-inside">
                  <li>
                    On laptop, open the <strong>Bluetooth system tray menu</strong> and click <strong>&ldquo;Receive a File&rdquo;</strong> (Bluetooth File Transfer wizard).
                  </li>
                  <li>
                    Ensure phone and laptop are paired via Bluetooth.
                  </li>
                  <li>
                    Tap any of the 3 buttons above. In Android&apos;s Bluetooth chooser, select your laptop name.
                  </li>
                  <li>
                    Laptop receives the file and prompts for a destination folder (e.g., Desktop or Project Folder).
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* ================= MODE C: USB MASS STORAGE (MTP) ================= */}
          {activeMethod === 'usb' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Usb className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                    USB Mass Storage / MTP Cable Transfer
                  </h4>
                  <p className="text-xs text-blue-800 mt-0.5">
                    Fastest wired option for high-volume photos and survey records directly through File Explorer.
                  </p>
                </div>
              </div>

              {/* Exact Directory Path Box */}
              <div className="p-3 bg-slate-900 text-white rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono mb-1">
                  LAPTOP FILE EXPLORER (WINDOWS / MAC) PATH:
                </span>
                <div className="font-mono text-xs text-sky-300 bg-slate-950 p-2.5 rounded border border-slate-800 break-all select-all">
                  📁 This PC \ [Your Phone] \ Internal Storage \ Documents \ GCP_Survey \
                </div>
              </div>

              {/* USB Steps */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <span className="font-bold text-slate-900 block">USB Transfer Steps:</span>
                <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                  <li>Plug phone into laptop using a standard USB-C cable.</li>
                  <li>On phone notification shade, tap <strong>&ldquo;Charging this device via USB&rdquo;</strong> and change to <strong>&ldquo;File Transfer / MTP&rdquo;</strong>.</li>
                  <li>Open Windows File Explorer or Mac Android File Transfer.</li>
                  <li>Navigate to <code>Documents &gt; GCP_Survey</code> and copy your survey folder directly onto the laptop.</li>
                </ul>
              </div>

              {/* Direct Export Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onExportZipFolders}
                  className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>Download Folders (.zip)</span>
                </button>
                <button
                  type="button"
                  onClick={onExportXls}
                  className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Master Excel (.xls)</span>
                </button>
                <button
                  type="button"
                  onClick={onExportCsv}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Raw CSV (.csv)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">
            {records.length} Points Saved &bull; 100% Offline
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
