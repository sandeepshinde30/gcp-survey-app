/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { GcpRecord } from '../types';
import { formatDMS } from './exif';

/**
 * Escapes CSV values to handle commas, quotes, and newlines safely
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Clean string for directory names
 */
export function sanitizeFolderName(str: string, fallback: string = 'Folder'): string {
  if (!str) return fallback;
  const clean = str.trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
  return clean || fallback;
}

/**
 * Build 4-level hierarchical folder path: Project / Operator / Date / GCP ID /
 */
export function buildHierarchicalPath(
  project: string,
  operator: string,
  date: string,
  gcpId: string
): string {
  const p = sanitizeFolderName(project, 'Project');
  const o = sanitizeFolderName(operator, 'Operator');
  const d = sanitizeFolderName(date, 'Date');
  const g = sanitizeFolderName(gcpId, 'GCP');
  return `${p}/${o}/${d}/${g}/`;
}

/**
 * Generates comprehensive CSV string matching survey and GIS standards
 */
export function generateCsv(records: GcpRecord[]): string {
  const headers = [
    'Record_ID',
    'GCP_ID',
    'Project_Name',
    'Operator_Name',
    'Survey_Date',
    'GCP_Start_Time',
    'GCP_End_Time',
    'Total_Observation_Time',
    'Observation_Seconds',
    'Folder_Hierarchy_Path',
    'Station_Type',
    'Survey_Mode',
    'Point_Mark_Type',
    'Point_Status',
    'Antenna_Height_m',
    'Latitude_Decimal',
    'Longitude_Decimal',
    'Latitude_DMS',
    'Longitude_DMS',
    'Altitude_m',
    'GPS_Accuracy_m',
    'Hotel_Latitude',
    'Hotel_Longitude',
    'Reference_Point',
    'Segment_Distance_m',
    'Accumulated_Distance_m',
    'Photos_Count',
    'Photos_Types',
    'Captured_At',
    'Notes',
  ];

  const rows = records.map((r) => {
    const latDms = formatDMS(r.latitude, true);
    const lonDms = formatDMS(r.longitude, false);
    const photosList = r.photos ? Object.keys(r.photos).join('; ') : '';
    const photosCount = r.photos ? Object.keys(r.photos).length : 0;
    const refPoint =
      r.prevPointType === 'hotel'
        ? 'Base Hotel'
        : r.prevPointType === 'gcp'
        ? `GCP (${r.prevPointId || 'Previous'})`
        : 'Initial Point';

    const fullPath =
      r.folderPath ||
      buildHierarchicalPath(r.projectName, r.operatorName, r.date, r.gcpId);

    return [
      escapeCsv(r.id),
      escapeCsv(r.gcpId),
      escapeCsv(r.projectName),
      escapeCsv(r.operatorName),
      escapeCsv(r.date),
      escapeCsv(r.startTime || r.createdAt),
      escapeCsv(r.endTime || r.createdAt),
      escapeCsv(r.totalObservationTime || '00:00:00'),
      escapeCsv(r.observationDurationSeconds || 0),
      escapeCsv(fullPath),
      escapeCsv(r.stationType?.toUpperCase() || 'GCP'),
      escapeCsv(r.surveyMode?.toUpperCase() || 'RTK'),
      escapeCsv(r.pointMarkType?.toUpperCase() || 'MARK'),
      escapeCsv(r.status.toUpperCase()),
      escapeCsv(r.antennaHeight.toFixed(3)),
      escapeCsv(r.latitude.toFixed(7)),
      escapeCsv(r.longitude.toFixed(7)),
      escapeCsv(latDms),
      escapeCsv(lonDms),
      escapeCsv(r.altitude != null ? r.altitude.toFixed(3) : ''),
      escapeCsv(r.accuracy != null ? r.accuracy.toFixed(2) : ''),
      escapeCsv(r.hotelLatitude != null ? r.hotelLatitude.toFixed(7) : ''),
      escapeCsv(r.hotelLongitude != null ? r.hotelLongitude.toFixed(7) : ''),
      escapeCsv(refPoint),
      escapeCsv(r.segmentDistanceMeters.toFixed(2)),
      escapeCsv(r.accumulatedDistanceMeters.toFixed(2)),
      escapeCsv(photosCount),
      escapeCsv(photosList),
      escapeCsv(r.createdAt),
      escapeCsv(r.notes || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Generates an Excel-compatible (.xls) HTML document with styling for Microsoft Excel
 * Includes Observation Start Time, End Time, Total Time and Hierarchical Folder Paths
 */
export function generateExcelXls(records: GcpRecord[]): string {
  const tableRows = records
    .map((r, index) => {
      const latDms = formatDMS(r.latitude, true);
      const lonDms = formatDMS(r.longitude, false);
      const photosCount = r.photos ? Object.keys(r.photos).length : 0;
      const refPoint =
        r.prevPointType === 'hotel'
          ? 'Base Hotel'
          : r.prevPointType === 'gcp'
          ? `GCP (${r.prevPointId || 'Previous'})`
          : 'Initial Point';

      const fullPath =
        r.folderPath ||
        buildHierarchicalPath(r.projectName, r.operatorName, r.date, r.gcpId);

      return `
      <tr>
        <td style="text-align:center;">${index + 1}</td>
        <td style="font-weight:bold; color:#0284c7;">${r.gcpId}</td>
        <td style="font-family:monospace; font-size:10px; background-color:#f8fafc; color:#1e293b;">${fullPath}</td>
        <td>${r.projectName}</td>
        <td>${r.operatorName}</td>
        <td>${r.date}</td>
        <td style="font-family:monospace; text-align:center; color:#0369a1;">${r.startTime || '-'}</td>
        <td style="font-family:monospace; text-align:center; color:#0369a1;">${r.endTime || '-'}</td>
        <td style="font-family:monospace; font-weight:bold; text-align:center; background-color:#eff6ff; color:#1d4ed8;">${r.totalObservationTime || '-'}</td>
        <td style="text-align:center; font-weight:bold; background-color:#f1f5f9;">${r.stationType?.toUpperCase() || 'GCP'}</td>
        <td style="text-align:center;">${r.surveyMode?.toUpperCase() || 'RTK'}</td>
        <td style="text-align:center;">${r.pointMarkType?.toUpperCase() || 'MARK'}</td>
        <td style="text-align:center; font-weight:bold; color:${r.status === 'normal' ? '#16a34a' : r.status === 'abnormal' ? '#d97706' : '#dc2626'};">${r.status.toUpperCase()}</td>
        <td style="text-align:right;">${r.antennaHeight.toFixed(3)}</td>
        <td style="text-align:right; font-family:monospace; font-weight:bold;">${r.latitude.toFixed(7)}</td>
        <td style="text-align:right; font-family:monospace; font-weight:bold;">${r.longitude.toFixed(7)}</td>
        <td style="font-family:monospace;">${latDms}</td>
        <td style="font-family:monospace;">${lonDms}</td>
        <td style="text-align:right;">${r.altitude != null ? r.altitude.toFixed(3) : '-'}</td>
        <td style="text-align:right;">${r.accuracy != null ? `±${r.accuracy.toFixed(2)}m` : '-'}</td>
        <td>${refPoint}</td>
        <td style="text-align:right; font-weight:bold; color:#0284c7;">${r.segmentDistanceMeters.toFixed(2)}</td>
        <td style="text-align:right; font-weight:bold; color:#059669;">${r.accumulatedDistanceMeters.toFixed(2)}</td>
        <td style="text-align:center; font-weight:bold;">${photosCount}</td>
        <td>${r.city}</td>
        <td>${r.notes || ''}</td>
      </tr>`;
    })
    .join('');

  return `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>GCP Survey Observations</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
    <style>
      table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px; }
      th { background-color: #0f172a; color: #ffffff; padding: 8px 6px; border: 1px solid #334155; font-size: 11px; white-space: nowrap; }
      td { padding: 6px; border: 1px solid #cbd5e1; white-space: nowrap; }
      .header-title { font-size: 16px; font-weight: bold; color: #1e3a8a; }
      .folder-rule { font-size: 12px; color: #475569; margin-bottom: 12px; }
    </style>
  </head>
  <body>
    <div class="header-title">GCP FIELD SURVEY OBSERVATION & POINT TRACKING REPORT</div>
    <div class="folder-rule">Folder Hierarchy: <b>[Project Name] / [Operator Name] / [Date] / [GCP ID] /</b> • Includes Start/End Times & Total Observation Durations</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>GCP ID</th>
          <th>Folder Hierarchy (Project/Operator/Date/GCP)</th>
          <th>Project Name</th>
          <th>Operator</th>
          <th>Date</th>
          <th>GCP Start Time</th>
          <th>GCP End Time</th>
          <th>Total Observation Time</th>
          <th>Station Role</th>
          <th>Survey Mode</th>
          <th>Mark Type</th>
          <th>Status</th>
          <th>Antenna Ht (m)</th>
          <th>Latitude (Decimal)</th>
          <th>Longitude (Decimal)</th>
          <th>Latitude (DMS)</th>
          <th>Longitude (DMS)</th>
          <th>Altitude (m)</th>
          <th>Accuracy</th>
          <th>Reference Point</th>
          <th>Segment Dist (m)</th>
          <th>Accumulated Dist (m)</th>
          <th>Photos Count</th>
          <th>City</th>
          <th>Field Notes</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </body>
  </html>`;
}

/**
 * Downloads string content as a file to phone storage / PC Downloads
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

/**
 * Triggers download of CSV for USB transfer to laptop
 */
export function exportRecordsAsCsv(records: GcpRecord[], projectName: string = 'Survey'): void {
  const csvData = generateCsv(records);
  const dateStr = new Date().toISOString().split('T')[0];
  const safeProject = sanitizeFolderName(projectName, 'GCP_Survey');
  const filename = `${safeProject}_${dateStr}.csv`;
  downloadFile(csvData, filename, 'text/csv;charset=utf-8;');
}

/**
 * Triggers download of XLS Excel spreadsheet file
 */
export function exportRecordsAsXls(records: GcpRecord[], projectName: string = 'Survey'): void {
  const xlsData = generateExcelXls(records);
  const dateStr = new Date().toISOString().split('T')[0];
  const safeProject = sanitizeFolderName(projectName, 'GCP_Survey');
  const filename = `${safeProject}_${dateStr}.xls`;
  downloadFile(xlsData, filename, 'application/vnd.ms-excel;charset=utf-8;');
}

/**
 * Converts a base64 DataURL into a Uint8Array byte array for ZIP archiving
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Exports all GCP survey records organized into 4-LEVEL HIERARCHICAL FOLDERS:
 * [Project Name] / [Operator Name] / [Date] / [GCP ID] /
 *
 * Inside each GCP ID folder:
 * - All photos: GCP_Side_East.jpg, GCP_Point_Nail.jpg, GCP_Point_Mark.jpg, etc.
 * - GCP_Observation_Report.txt (with start time, end time, total observation duration, lat/long)
 * - GCP_Data.csv
 *
 * Root folder:
 * - Master_GCP_Survey_Report.csv
 * - Master_GCP_Survey_Report.xls
 */
export async function exportAllGcpFoldersZip(records: GcpRecord[], projectName: string = 'Survey'): Promise<void> {
  const zip = new JSZip();

  // 1. Add Master CSV and XLS at root
  const masterCsv = generateCsv(records);
  const masterXls = generateExcelXls(records);
  zip.file('Master_GCP_Survey_Report.csv', masterCsv);
  zip.file('Master_GCP_Survey_Report.xls', masterXls);

  // 2. Build 4-level hierarchy: Project / Operator / Date / GCP ID
  for (const record of records) {
    const cleanProject = sanitizeFolderName(record.projectName, 'Project');
    const cleanOperator = sanitizeFolderName(record.operatorName, 'Operator');
    const cleanDate = sanitizeFolderName(record.date, 'Date');
    const cleanGcpId = sanitizeFolderName(record.gcpId, 'GCP_Point');

    // Nested folders: Project/Operator/Date/GCP_ID/
    const gcpFolder = zip
      .folder(cleanProject)
      ?.folder(cleanOperator)
      ?.folder(cleanDate)
      ?.folder(cleanGcpId);

    if (!gcpFolder) continue;

    const fullHierarchicalPath = `${cleanProject}/${cleanOperator}/${cleanDate}/${cleanGcpId}/`;

    // Add GCP individual observation report text file
    const detailsText = `GCP SURVEY FIELD OBSERVATION REPORT
============================================================
Folder Structure:     ${fullHierarchicalPath}
Project Name:         ${record.projectName}
Operator Name:        ${record.operatorName}
Survey Date:          ${record.date}
GCP ID:               ${record.gcpId}

OBSERVATION TIMING:
------------------------------------------------------------
Start Time:           ${record.startTime || record.createdAt}
End Time:             ${record.endTime || record.createdAt}
Total Observation:    ${record.totalObservationTime || 'N/A'}
Duration Seconds:     ${record.observationDurationSeconds || 0} seconds

STATION & INSTRUMENT:
------------------------------------------------------------
Station Role:         ${record.stationType?.toUpperCase() || 'GCP'}
Survey Mode:          ${record.surveyMode?.toUpperCase() || 'RTK'}
Point Mark Type:      ${record.pointMarkType?.toUpperCase() || 'MARK'}
Point Status:         ${record.status.toUpperCase()}
Antenna Height:       ${record.antennaHeight} m

COORDINATES (WGS-84):
------------------------------------------------------------
Latitude (Decimal):   ${record.latitude.toFixed(7)}°
Longitude (Decimal):  ${record.longitude.toFixed(7)}°
Latitude (DMS):       ${formatDMS(record.latitude, true)}
Longitude (DMS):      ${formatDMS(record.longitude, false)}
Altitude (Elevation): ${record.altitude != null ? `${record.altitude.toFixed(3)} m` : 'N/A'}
GPS Accuracy:         ${record.accuracy != null ? `±${record.accuracy.toFixed(2)} m` : 'N/A'}

DISTANCE TRACKING:
------------------------------------------------------------
Reference Point:      ${record.prevPointId || 'Base Hotel'}
Segment Distance:     ${record.segmentDistanceMeters.toFixed(2)} m
Accumulated Distance: ${record.accumulatedDistanceMeters.toFixed(2)} m
Captured Timestamp:   ${record.createdAt}
Field Notes:          ${record.notes || 'None'}
============================================================
`;
    gcpFolder.file(`${cleanGcpId}_Observation_Report.txt`, detailsText);
    gcpFolder.file(`${cleanGcpId}_Data.csv`, generateCsv([record]));

    // Add photos inside this GCP folder
    if (record.photos) {
      for (const [key, photo] of Object.entries(record.photos)) {
        if (photo?.dataUrl) {
          try {
            const bytes = dataUrlToUint8Array(photo.dataUrl);
            const safePhotoTitle = sanitizeFolderName(photo.title, key);
            const photoFileName = `${cleanGcpId}_${safePhotoTitle}.jpg`;
            gcpFolder.file(photoFileName, bytes);
          } catch (e) {
            console.warn(`Failed to package photo ${key} into zip`, e);
          }
        }
      }
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  const safeProject = sanitizeFolderName(projectName, 'GCP_Survey');
  a.download = `${safeProject}_Hierarchical_Folders_${dateStr}.zip`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}

/**
 * Downloads a single GCP's dedicated folder as a ZIP file (preserving 4-level hierarchy)
 */
export async function exportSingleGcpFolderZip(record: GcpRecord): Promise<void> {
  await exportAllGcpFoldersZip([record], `${record.gcpId}_Package`);
}

/**
 * Generates GeoJSON FeatureCollection for QGIS / ArcGIS
 */
export function generateGeoJson(records: GcpRecord[]): string {
  const features = records.map((r) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [r.longitude, r.latitude, r.altitude || 0],
    },
    properties: {
      gcpId: r.gcpId,
      stationType: r.stationType,
      surveyMode: r.surveyMode,
      pointMarkType: r.pointMarkType,
      projectName: r.projectName,
      city: r.city,
      operator: r.operatorName,
      status: r.status,
      startTime: r.startTime,
      endTime: r.endTime,
      totalObservationTime: r.totalObservationTime,
      folderPath:
        r.folderPath ||
        buildHierarchicalPath(r.projectName, r.operatorName, r.date, r.gcpId),
      antennaHeight: r.antennaHeight,
      accuracy: r.accuracy,
      segmentDistance: r.segmentDistanceMeters,
      accumulatedDistance: r.accumulatedDistanceMeters,
      date: r.date,
      createdAt: r.createdAt,
    },
  }));

  const geojson = {
    type: 'FeatureCollection',
    name: 'GCP_Survey_Points',
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    features,
  };

  return JSON.stringify(geojson, null, 2);
}
