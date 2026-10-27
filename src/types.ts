/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PointStatus = 'normal' | 'abnormal' | 'redo';

export type SurveyMode =
  | 'rtk'
  | 'static'
  | 'ppk'
  | 'stop_and_go'
  | 'dgps'
  | 'fast_static';

export type StationType = 'gcp' | 'base' | 'check_point' | 'tbm';

export type PointMarkType =
  | 'nail'
  | 'paint_mark'
  | 'chisel_cross'
  | 'peg'
  | 'rebar_cap'
  | 'other';

export type PhotoType =
  // 4 Cardinal Side Photos
  | 'east'
  | 'south'
  | 'west'
  | 'north'
  // Ground Mark / Point Photos (Nail, Mark, Close-up)
  | 'point_nail'
  | 'point_mark'
  | 'point_closeup'
  // Equipment Verification Photos
  | 'bubble'
  | 'tripod'
  | 'antenna'
  // 4 Other Field Photos
  | 'other_1'
  | 'other_2'
  | 'other_3'
  | 'other_4';

export interface PhotoInfo {
  type: PhotoType;
  title: string;
  category: 'side' | 'point' | 'equipment' | 'other';
  dataUrl?: string;
  capturedAt?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  filename?: string;
}

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number;
  provider?: string;
}

export interface GcpRecord {
  id: string; // UUID / timestamp
  date: string; // YYYY-MM-DD
  projectName: string;
  city: string;
  operatorName: string;
  gcpId: string;
  status: PointStatus;
  surveyMode: SurveyMode; // Static, RTK, PPK, Stop & Go, DGPS, Fast Static
  stationType: StationType; // Base Station vs GCP vs Check Point vs TBM
  pointMarkType: PointMarkType; // Nail, Paint Mark, Chisel Cross, etc.
  antennaHeight: number; // in meters
  // Coordinates of this GCP
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  // Distance tracking details
  prevPointType: 'hotel' | 'gcp' | 'none';
  prevPointId: string | null;
  segmentDistanceMeters: number;
  accumulatedDistanceMeters: number;
  // Reference Hotel
  hotelLatitude?: number | null;
  hotelLongitude?: number | null;
  // Observation Timing (Automatic GNSS Occupation Tracking)
  startTime: string; // e.g. "2026-10-27 09:15:20"
  endTime: string; // e.g. "2026-10-27 09:45:35"
  totalObservationTime: string; // e.g. "30m 15s" or "00:30:15"
  observationDurationSeconds: number; // e.g. 1815 seconds
  // Hierarchical Folder Structure: Project Name / Operator Name / Date / GCP ID /
  folderPath: string; // e.g. "Highway_NH-48/Rajesh_Sharma/2026-10-27/GCP-001/"
  folderHierarchy?: {
    projectName: string;
    operatorName: string;
    date: string;
    gcpId: string;
  };
  // Photos with EXIF metadata
  photos: Partial<Record<PhotoType, PhotoInfo>>;
  createdAt: string;
  notes?: string;
}

export interface SurveySession {
  hotelLocation: GpsCoordinates | null;
  hotelCapturedAt: string | null;
  hotelName: string;
  currentGcpLocation: GpsCoordinates | null;
  lastRecordedGcp: {
    gcpId: string;
    latitude: number;
    longitude: number;
  } | null;
  accumulatedDistanceMeters: number;
}
