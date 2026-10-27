/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Code2,
  Download,
  Copy,
  Check,
  FileCode,
  FolderTree,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { ANDROID_PROJECT_FILES, downloadAndroidProjectZip } from '../utils/androidProjectCode';

export const AndroidCodeExplorer: React.FC = () => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const currentFile = ANDROID_PROJECT_FILES[selectedFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadAndroidProjectZip();
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold">
              Native Android Project Code (Kotlin & Jetpack Compose)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Production-ready Android Studio project with Room SQLite, Location.distanceBetween(), CameraX, and ExifInterface.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={isZipping}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>{isZipping ? 'Bundling ZIP...' : 'Download Android Studio Project (.zip)'}</span>
        </button>
      </div>

      {/* Code Browser Grid */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg flex flex-col lg:flex-row min-h-[550px]">
        {/* Left Sidebar: File Tree */}
        <div className="w-full lg:w-72 bg-slate-950/80 border-b lg:border-b-0 lg:border-r border-slate-800 p-3 shrink-0 flex flex-col">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5 px-2">
            <FolderTree className="w-3.5 h-3.5 text-blue-400" />
            <span>Project Files</span>
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[220px] lg:max-h-none flex-1">
            {ANDROID_PROJECT_FILES.map((file, idx) => {
              const isSelected = idx === selectedFileIndex;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                    isSelected
                      ? 'bg-blue-600 text-white font-medium shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
                  <span className="truncate">{file.filename}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Code Viewer */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900">
          {/* File Header Bar */}
          <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-mono text-xs font-semibold text-sky-300 block truncate">
                {currentFile.path}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                {currentFile.description}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Syntax Content Box */}
          <div className="p-4 overflow-x-auto flex-1 font-mono text-xs text-slate-300 leading-relaxed bg-[#0b101b]">
            <pre className="select-text whitespace-pre">
              <code>{currentFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
