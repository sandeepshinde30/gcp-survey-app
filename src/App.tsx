/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  GcpRecord,
  GpsCoordinates,
  SurveySession,
} from './types';
import { distanceBetween } from './utils/distance';
import {
  getAllRecords,
  saveRecord,
  deleteRecord,
  getStoredSession,
  saveStoredSession,
  clearStoredSession,
} from './utils/storage';
import { exportRecordsAsCsv, exportRecordsAsXls, exportAllGcpFoldersZip, generateGeoJson, downloadFile } from './utils/csv';
import { downloadAndroidProjectZip } from './utils/androidProjectCode';
import { TopAppBar } from './components/TopAppBar';
import { SurveyForm } from './components/SurveyForm';
import { RecordsList } from './components/RecordsList';
import { RoutePathVisualizer } from './components/RoutePathVisualizer';
import { AndroidCodeExplorer } from './components/AndroidCodeExplorer';
import { LaptopSyncModal } from './components/LaptopSyncModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'survey' | 'records' | 'path' | 'kotlin'>('survey');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [records, setRecords] = useState<GcpRecord[]>([]);
  const [session, setSession] = useState<SurveySession>(getStoredSession);
  const [isLaptopSyncOpen, setIsLaptopSyncOpen] = useState<boolean>(false);

  // Load records from offline IndexedDB on launch
  useEffect(() => {
    async function loadInitialData() {
      const dbRecords = await getAllRecords();
      if (dbRecords.length > 0) {
        setRecords(dbRecords);
        // Sync session's last recorded GCP with most recent record if available
        if (!session.lastRecordedGcp) {
          const latest = dbRecords[0];
          setSession((prev) => ({
            ...prev,
            lastRecordedGcp: {
              gcpId: latest.gcpId,
              latitude: latest.latitude,
              longitude: latest.longitude,
            },
            accumulatedDistanceMeters: latest.accumulatedDistanceMeters || prev.accumulatedDistanceMeters,
          }));
        }
      } else {
        // Seed 2 realistic sample records for instant evaluation & demonstration
        const sampleBaseLat = 18.52043;
        const sampleBaseLon = 73.85674;
        const dist1 = distanceBetween(sampleBaseLat, sampleBaseLon, 18.52185, 73.85792).distance;
        const dist2 = distanceBetween(18.52185, 73.85792, 18.52341, 73.85965).distance;

        const todayIso = new Date().toISOString().split('T')[0];
        const sample1: GcpRecord = {
          id: 'sample_gcp_001',
          date: todayIso,
          projectName: 'Highway NH-48 Expansion Survey',
          city: 'Pune',
          operatorName: 'Rajesh Sharma',
          gcpId: 'GCP-001',
          status: 'normal',
          surveyMode: 'rtk',
          stationType: 'gcp',
          pointMarkType: 'nail',
          antennaHeight: 1.80,
          latitude: 18.52185,
          longitude: 73.85792,
          altitude: 562.4,
          accuracy: 1.9,
          prevPointType: 'hotel',
          prevPointId: 'Base Hotel',
          segmentDistanceMeters: dist1,
          accumulatedDistanceMeters: dist1,
          hotelLatitude: sampleBaseLat,
          hotelLongitude: sampleBaseLon,
          startTime: `${todayIso} 08:30:00`,
          endTime: `${todayIso} 08:45:15`,
          totalObservationTime: '15m 15s',
          observationDurationSeconds: 915,
          folderPath: `Highway_NH-48/Rajesh_Sharma/${todayIso}/GCP-001/`,
          folderHierarchy: {
            projectName: 'Highway NH-48 Expansion Survey',
            operatorName: 'Rajesh Sharma',
            date: todayIso,
            gcpId: 'GCP-001',
          },
          photos: {},
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          notes: 'PK nail driven into concrete pavement. Clear 360 view.',
        };

        const sample2: GcpRecord = {
          id: 'sample_gcp_002',
          date: todayIso,
          projectName: 'Highway NH-48 Expansion Survey',
          city: 'Pune',
          operatorName: 'Rajesh Sharma',
          gcpId: 'GCP-002',
          status: 'normal',
          surveyMode: 'static',
          stationType: 'gcp',
          pointMarkType: 'chisel_cross',
          antennaHeight: 1.80,
          latitude: 18.52341,
          longitude: 73.85965,
          altitude: 564.1,
          accuracy: 2.1,
          prevPointType: 'gcp',
          prevPointId: 'GCP-001',
          segmentDistanceMeters: dist2,
          accumulatedDistanceMeters: dist1 + dist2,
          hotelLatitude: sampleBaseLat,
          hotelLongitude: sampleBaseLon,
          startTime: `${todayIso} 09:10:00`,
          endTime: `${todayIso} 09:40:30`,
          totalObservationTime: '30m 30s',
          observationDurationSeconds: 1830,
          folderPath: `Highway_NH-48/Rajesh_Sharma/${todayIso}/GCP-002/`,
          folderHierarchy: {
            projectName: 'Highway NH-48 Expansion Survey',
            operatorName: 'Rajesh Sharma',
            date: todayIso,
            gcpId: 'GCP-002',
          },
          photos: {},
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          notes: 'Chiseled cross mark on corner of culvert slab.',
        };

        await saveRecord(sample1);
        await saveRecord(sample2);
        setRecords([sample2, sample1]);

        // Initialize session with sample hotel
        const seededSession: SurveySession = {
          hotelLocation: {
            latitude: sampleBaseLat,
            longitude: sampleBaseLon,
            altitude: 558.0,
            accuracy: 1.8,
            timestamp: Date.now() - 7200000,
          },
          hotelCapturedAt: new Date(Date.now() - 7200000).toISOString(),
          hotelName: 'Survey Base Hotel',
          currentGcpLocation: null,
          lastRecordedGcp: {
            gcpId: 'GCP-002',
            latitude: 18.52341,
            longitude: 73.85965,
          },
          accumulatedDistanceMeters: dist1 + dist2,
        };
        setSession(seededSession);
        saveStoredSession(seededSession);
      }
    }

    loadInitialData();
  }, []);

  // Save session state to localStorage whenever it changes
  useEffect(() => {
    saveStoredSession(session);
  }, [session]);

  // Point-to-Point Distance Calculation Engine:
  // - If previous GCP exists: calculate distance from previous GCP to current GCP
  // - If no previous GCP but Hotel exists: calculate distance from Hotel to current GCP
  // - Otherwise: 0
  const { segmentDistance, previousPointType, previousPointLabel, initialBearing } = useMemo(() => {
    if (!session.currentGcpLocation) {
      return {
        segmentDistance: 0,
        previousPointType: 'none' as const,
        previousPointLabel: 'Capture GCP to track distance',
        initialBearing: 0,
      };
    }

    const { latitude: curLat, longitude: curLon } = session.currentGcpLocation;

    if (session.lastRecordedGcp) {
      const { latitude: prevLat, longitude: prevLon, gcpId } = session.lastRecordedGcp;
      const res = distanceBetween(prevLat, prevLon, curLat, curLon);
      return {
        segmentDistance: res.distance,
        previousPointType: 'gcp' as const,
        previousPointLabel: `Previous GCP (${gcpId})`,
        initialBearing: res.initialBearing,
      };
    }

    if (session.hotelLocation) {
      const { latitude: hLat, longitude: hLon } = session.hotelLocation;
      const res = distanceBetween(hLat, hLon, curLat, curLon);
      return {
        segmentDistance: res.distance,
        previousPointType: 'hotel' as const,
        previousPointLabel: 'Base Hotel',
        initialBearing: res.initialBearing,
      };
    }

    return {
      segmentDistance: 0,
      previousPointType: 'none' as const,
      previousPointLabel: 'First Point (No Hotel Reference)',
      initialBearing: 0,
    };
  }, [session.currentGcpLocation, session.lastRecordedGcp, session.hotelLocation]);

  // Handle Hotel Location Capture
  const handleCaptureHotel = (coords: GpsCoordinates) => {
    setSession((prev) => ({
      ...prev,
      hotelLocation: coords,
      hotelCapturedAt: new Date().toISOString(),
    }));
  };

  // Handle GCP Location Capture
  const handleCaptureGcp = (coords: GpsCoordinates) => {
    setSession((prev) => ({
      ...prev,
      currentGcpLocation: coords,
    }));
  };

  // Handle Record Saved to Local SQLite / IndexedDB
  const handleSaveRecord = async (record: GcpRecord) => {
    await saveRecord(record);
    const updatedRecords = await getAllRecords();
    setRecords(updatedRecords);

    // Update session: this GCP becomes the previous point for the next point,
    // and accumulated distance advances
    setSession((prev) => ({
      ...prev,
      lastRecordedGcp: {
        gcpId: record.gcpId,
        latitude: record.latitude,
        longitude: record.longitude,
      },
      currentGcpLocation: null,
      accumulatedDistanceMeters: record.accumulatedDistanceMeters,
    }));
  };

  // Handle Record Delete
  const handleDeleteRecord = async (id: string) => {
    if (window.confirm('Delete this survey point from local database?')) {
      await deleteRecord(id);
      const updated = await getAllRecords();
      setRecords(updated);
    }
  };

  // Handle Reset Session
  const handleResetSession = () => {
    if (window.confirm('Reset current survey day session and distance accumulator? (Saved records in SQLite will NOT be deleted)')) {
      const cleared = clearStoredSession();
      setSession(cleared);
    }
  };

  // Handle Export CSV
  const handleExportCsv = () => {
    const projName = records[0]?.projectName || 'GCP_Survey';
    exportRecordsAsCsv(records, projName);
  };

  // Handle Export XLS (Excel)
  const handleExportXls = () => {
    const projName = records[0]?.projectName || 'GCP_Survey';
    exportRecordsAsXls(records, projName);
  };

  // Handle Export All GCP Folders ZIP
  const handleExportZipFolders = async () => {
    const projName = records[0]?.projectName || 'GCP_Survey';
    await exportAllGcpFoldersZip(records, projName);
  };

  // Handle Export GeoJSON
  const handleExportGeoJson = () => {
    const geojson = generateGeoJson(records);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(geojson, `GCP_Survey_Points_${dateStr}.geojson`, 'application/geo+json');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased flex flex-col">
      {/* Top Application Bar */}
      <TopAppBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileFrame={isMobileFrame}
        setIsMobileFrame={setIsMobileFrame}
        recordCount={records.length}
        accumulatedDistance={session.accumulatedDistanceMeters}
        onExportCsv={handleExportCsv}
        onExportXls={handleExportXls}
        onExportZipFolders={handleExportZipFolders}
        onDownloadAndroidZip={downloadAndroidProjectZip}
        onOpenLaptopSync={() => setIsLaptopSyncOpen(true)}
      />

      {/* Main Container: Mobile Frame vs Wide Field Viewport */}
      <main className="flex-1 flex justify-center py-4 sm:py-6 px-3 sm:px-6">
        <div
          className={`w-full transition-all duration-200 ${
            isMobileFrame
              ? 'max-w-[440px] bg-slate-50 border-8 border-slate-900 rounded-[36px] shadow-2xl p-4 sm:p-5 overflow-hidden min-h-[740px]'
              : 'max-w-5xl'
          }`}
        >
          {/* Simulated Mobile Status Bar (when mobile frame is active) */}
          {isMobileFrame && (
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pb-3 mb-2 border-b border-slate-200">
              <span>9:41</span>
              <div className="w-16 h-4 bg-slate-800 rounded-full mx-auto" />
              <div className="flex items-center gap-1">
                <span>GPS</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Tab 1: Survey Form Screen */}
          {activeTab === 'survey' && (
            <SurveyForm
              hotelLocation={session.hotelLocation}
              currentGcpLocation={session.currentGcpLocation}
              segmentDistance={segmentDistance}
              accumulatedDistance={session.accumulatedDistanceMeters}
              previousPointType={previousPointType}
              previousPointLabel={previousPointLabel}
              onCaptureHotel={handleCaptureHotel}
              onCaptureGcp={handleCaptureGcp}
              onResetSession={handleResetSession}
              onSaveRecord={handleSaveRecord}
            />
          )}

          {/* Tab 2: Saved Records List Screen */}
          {activeTab === 'records' && (
            <RecordsList
              records={records}
              onDeleteRecord={handleDeleteRecord}
              onExportCsv={handleExportCsv}
              onExportXls={handleExportXls}
              onExportZipFolders={handleExportZipFolders}
              onExportGeoJson={handleExportGeoJson}
              onOpenLaptopSync={() => setIsLaptopSyncOpen(true)}
            />
          )}

          {/* Tab 3: Point-to-Point Path Visualizer Screen */}
          {activeTab === 'path' && (
            <RoutePathVisualizer
              records={records}
              hotelLocation={session.hotelLocation}
              accumulatedDistance={session.accumulatedDistanceMeters}
            />
          )}

          {/* Tab 4: Native Android Kotlin & Compose Codebase */}
          {activeTab === 'kotlin' && <AndroidCodeExplorer />}
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="py-4 border-t border-slate-200 text-center text-xs text-slate-500 bg-white">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Ground Control Point (GCP) Field Survey Engine • Offline SQLite Storage</span>
          <span>WGS-84 Distance Tracker • EXIF GPS Geotagging</span>
        </div>
      </footer>

      {/* Laptop Connect & Transfer Modal (USB / Wi-Fi Hotspot / Bluetooth) */}
      {isLaptopSyncOpen && (
        <LaptopSyncModal
          records={records}
          onClose={() => setIsLaptopSyncOpen(false)}
          onExportCsv={handleExportCsv}
          onExportXls={handleExportXls}
          onExportZipFolders={handleExportZipFolders}
        />
      )}
    </div>
  );
}
