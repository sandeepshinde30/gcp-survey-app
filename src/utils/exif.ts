/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PhotoType } from '../types';

/**
 * Format decimal degrees into GPS Degrees, Minutes, Seconds (DMS) string
 */
export function formatDMS(deg: number, isLatitude: boolean): string {
  const absolute = Math.abs(deg);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60 * 100) / 100;

  const direction = isLatitude
    ? deg >= 0
      ? 'N'
      : 'S'
    : deg >= 0
    ? 'E'
    : 'W';

  return `${degrees}°${minutes}'${seconds.toFixed(2)}"${direction}`;
}

export interface WatermarkDetails {
  photoType: PhotoType;
  title: string;
  gcpId: string;
  projectName: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  antennaHeight?: number;
  timestamp: string;
  operatorName?: string;
}

/**
 * Stamps professional surveyor watermark directly onto the canvas before export
 */
export function stampSurveyWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  details: WatermarkDetails
): void {
  const pad = Math.max(16, Math.floor(width * 0.02));
  const bannerHeight = Math.max(76, Math.floor(height * 0.16));

  // Dark translucent background banner at bottom
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'; // slate-900 with 85% opacity
  ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

  // Top hairline accent line in high-visibility yellow/amber
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, height - bannerHeight, width, 3);

  // Typography
  const titleSize = Math.max(15, Math.floor(width * 0.028));
  const textSize = Math.max(12, Math.floor(width * 0.022));

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${titleSize}px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const leftX = pad;
  let currentY = height - bannerHeight + pad * 0.6;

  // Header line: GCP ID + Photo Type
  ctx.fillText(
    `[GCP: ${details.gcpId || 'UNASSIGNED'}] ${details.title.toUpperCase()}`,
    leftX,
    currentY
  );

  // Row 2: GPS Coordinates in Decimal & DMS
  currentY += titleSize + 4;
  ctx.font = `${textSize}px monospace`;
  ctx.fillStyle = '#38bdf8'; // light sky blue for coordinates
  const latStr = formatDMS(details.latitude, true);
  const lonStr = formatDMS(details.longitude, false);
  const coordsLine = `LAT: ${details.latitude.toFixed(6)}° (${latStr})  LON: ${details.longitude.toFixed(6)}° (${lonStr})`;
  ctx.fillText(coordsLine, leftX, currentY);

  // Row 3: Altitude, Antenna Height, Timestamp
  currentY += textSize + 3;
  ctx.fillStyle = '#e2e8f0';
  const altText = details.altitude != null ? `${details.altitude.toFixed(1)}m` : 'N/A';
  const antText = details.antennaHeight ? `${details.antennaHeight.toFixed(2)}m` : 'N/A';
  ctx.fillText(
    `ALT: ${altText} | ANT: ${antText} | ${details.timestamp} | OP: ${details.operatorName || 'Field'}`,
    leftX,
    currentY
  );

  // Right-side badge
  ctx.fillStyle = '#10b981'; // emerald
  ctx.font = `bold ${textSize}px monospace`;
  ctx.textAlign = 'right';
  ctx.fillText('GPS EXIF TAGGED', width - pad, height - bannerHeight + pad * 0.6);

  ctx.restore();
}

/**
 * Injects GPS EXIF APP1 segment into a JPEG DataURL.
 * This ensures that standard photo viewers or extraction tools
 * can read the embedded GPS coordinates directly from the image file.
 */
export function injectGpsExif(
  jpegDataUrl: string,
  latitude: number,
  longitude: number,
  altitude: number = 0,
  timestampStr?: string
): string {
  try {
    // If input is not a jpeg data url, return as is
    if (!jpegDataUrl.startsWith('data:image/jpeg') && !jpegDataUrl.startsWith('data:image/jpg')) {
      return jpegDataUrl;
    }

    const base64Data = jpegDataUrl.split(',')[1];
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Verify JPEG SOI marker (0xFFD8)
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      return jpegDataUrl;
    }

    // Construct GPS IFD block
    const latRef = latitude >= 0 ? 'N' : 'S';
    const lonRef = longitude >= 0 ? 'E' : 'W';
    const absLat = Math.abs(latitude);
    const absLon = Math.abs(longitude);

    const latDeg = Math.floor(absLat);
    const latMin = Math.floor((absLat - latDeg) * 60);
    const latSec = Math.round((absLat - latDeg - latMin / 60) * 3600 * 100);

    const lonDeg = Math.floor(absLon);
    const lonMin = Math.floor((absLon - lonDeg) * 60);
    const lonSec = Math.round((absLon - lonDeg - lonMin / 60) * 3600 * 100);

    // Build minimal Exif header (APP1)
    // Exif\0\0 + TIFF Header (Little Endian 'II' + 42)
    // IFD0 -> ExifIFD / GPSIFD
    // To ensure broad compatibility and lightweight encoding without heavy external C-libraries,
    // we package the standard GPS IFD bytes.
    const exifHeader = [
      0xff, 0xe1, // APP1 marker
      0x00, 0x00, // length placeholder (bytes 2-3)
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // 'Exif\0\0'
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // TIFF header: II, 42, offset 8
    ];

    // IFD0 entries: 1 entry pointing to GPS IFD (tag 0x8825)
    // Tag: 0x8825 (GPSInfoIFDPointer), Type: 4 (LONG), Count: 1, Value: offset
    const ifd0 = [
      0x01, 0x00, // 1 entry
      0x25, 0x88, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x1a, 0x00, 0x00, 0x00, // tag 0x8825, offset 26
      0x00, 0x00, 0x00, 0x00, // Next IFD offset: 0
    ];

    // GPS IFD (at offset 0x1A = 26 from TIFF header)
    // 5 entries: GPSVersionID (0x0000), GPSLatitudeRef (0x0001), GPSLatitude (0x0002), GPSLongitudeRef (0x0003), GPSLongitude (0x0004)
    const gpsIfdEntriesCount = 5;
    const gpsDataOffset = 26 + 2 + gpsIfdEntriesCount * 12 + 4; // offset where rational data begins

    const gpsIfd = [
      gpsIfdEntriesCount, 0x00,
      // 1. GPSVersionID (0x0000)
      0x00, 0x00, 0x01, 0x00, 0x04, 0x00, 0x00, 0x00, 0x02, 0x02, 0x00, 0x00,
      // 2. GPSLatitudeRef (0x0001)
      0x01, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x00, latRef.charCodeAt(0), 0x00, 0x00, 0x00,
      // 3. GPSLatitude (0x0002) - 3 RATIONALs (24 bytes) at gpsDataOffset
      0x02, 0x00, 0x05, 0x00, 0x03, 0x00, 0x00, 0x00,
      gpsDataOffset & 0xff, (gpsDataOffset >> 8) & 0xff, (gpsDataOffset >> 16) & 0xff, 0x00,
      // 4. GPSLongitudeRef (0x0003)
      0x03, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x00, lonRef.charCodeAt(0), 0x00, 0x00, 0x00,
      // 5. GPSLongitude (0x0004) - 3 RATIONALs (24 bytes) at gpsDataOffset + 24
      0x04, 0x00, 0x05, 0x00, 0x03, 0x00, 0x00, 0x00,
      (gpsDataOffset + 24) & 0xff, ((gpsDataOffset + 24) >> 8) & 0xff, ((gpsDataOffset + 24) >> 16) & 0xff, 0x00,
      0x00, 0x00, 0x00, 0x00, // Next IFD
    ];

    // Helper to write unsigned 32-bit int
    function writeU32(val: number): number[] {
      return [val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >> 24) & 0xff];
    }

    // Latitude rationals: [latDeg/1, latMin/1, latSec/100]
    const latRationals = [
      ...writeU32(latDeg), ...writeU32(1),
      ...writeU32(latMin), ...writeU32(1),
      ...writeU32(latSec), ...writeU32(100),
    ];

    // Longitude rationals: [lonDeg/1, lonMin/1, lonSec/100]
    const lonRationals = [
      ...writeU32(lonDeg), ...writeU32(1),
      ...writeU32(lonMin), ...writeU32(1),
      ...writeU32(lonSec), ...writeU32(100),
    ];

    const tiffPayload = [...ifd0, ...gpsIfd, ...latRationals, ...lonRationals];
    const totalApp1Length = 2 + 6 + 8 + tiffPayload.length; // +2 for length field itself
    exifHeader[2] = (totalApp1Length >> 8) & 0xff;
    exifHeader[3] = totalApp1Length & 0xff;

    const fullApp1 = new Uint8Array([...exifHeader, ...tiffPayload]);

    // Insert APP1 right after SOI (index 2)
    const newBytes = new Uint8Array(bytes.length + fullApp1.length);
    newBytes.set(bytes.subarray(0, 2), 0); // 0xFFD8
    newBytes.set(fullApp1, 2);
    newBytes.set(bytes.subarray(2), 2 + fullApp1.length);

    // Convert back to base64
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < newBytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(newBytes.subarray(i, i + chunk)));
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  } catch (err) {
    console.error('Failed to inject EXIF GPS, returning raw photo dataUrl:', err);
    return jpegDataUrl;
  }
}
