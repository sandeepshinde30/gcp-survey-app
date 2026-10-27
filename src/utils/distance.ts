/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Android's android.location.Location.distanceBetween() calculation.
 * Computes the approximate distance in meters between two locations using the
 * WGS84 ellipsoid (the standard reference ellipsoid used by GPS and Android).
 */
export function distanceBetween(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number
): { distance: number; initialBearing: number; finalBearing: number } {
  // WGS84 ellipsoid constants
  const a = 6378137.0; // semi-major axis (meters)
  const b = 6356752.314245; // semi-minor axis (meters)
  const f = 1 / 298.257223563; // flattening

  const lat1 = (startLatitude * Math.PI) / 180.0;
  const lon1 = (startLongitude * Math.PI) / 180.0;
  const lat2 = (endLatitude * Math.PI) / 180.0;
  const lon2 = (endLongitude * Math.PI) / 180.0;

  // Handle identical points
  if (Math.abs(startLatitude - endLatitude) < 1e-9 && Math.abs(startLongitude - endLongitude) < 1e-9) {
    return { distance: 0, initialBearing: 0, finalBearing: 0 };
  }

  const L = lon2 - lon1;
  const U1 = Math.atan((1 - f) * Math.tan(lat1));
  const U2 = Math.atan((1 - f) * Math.tan(lat2));
  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  let lambda = L;
  let lambdaP = 2 * Math.PI;
  let iterLimit = 20;
  let cosSqAlpha = 0;
  let sinSigma = 0;
  let cos2SigmaM = 0;
  let cosSigma = 0;
  let sigma = 0;

  while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0) {
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      cosU2 * sinLambda * (cosU2 * sinLambda) +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) *
          (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)
    );

    if (sinSigma === 0) {
      return { distance: 0, initialBearing: 0, finalBearing: 0 };
    }

    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;
    cos2SigmaM = cosSqAlpha !== 0 ? cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha : 0;

    const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    lambdaP = lambda;
    lambda =
      L +
      (1 - C) *
        f *
        sinAlpha *
        (sigma +
          C *
            sinSigma *
            (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
  }

  // Fallback to Haversine if Vincenty does not converge (e.g. nearly antipodal)
  if (iterLimit === 0) {
    const R = 6371000; // Earth mean radius in meters
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const hA =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(hA), Math.sqrt(1 - hA));
    const dist = R * c;
    return { distance: dist, initialBearing: 0, finalBearing: 0 };
  }

  const uSq = (cosSqAlpha * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma =
    B *
    sinSigma *
    (cos2SigmaM +
      (B / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
          (B / 6) *
            cos2SigmaM *
            (-3 + 4 * sinSigma * sinSigma) *
            (-3 + 4 * cos2SigmaM * cos2SigmaM)));

  const distance = b * A * (sigma - deltaSigma);

  // Initial and final bearings in degrees [0, 360)
  const initialBearing =
    ((Math.atan2(
      cosU2 * Math.sin(lambda),
      cosU1 * sinU2 - sinU1 * cosU2 * Math.cos(lambda)
    ) *
      180) /
      Math.PI +
      360) %
    360;

  const finalBearing =
    ((Math.atan2(
      cosU1 * Math.sin(lambda),
      -sinU1 * cosU2 + cosU1 * sinU2 * Math.cos(lambda)
    ) *
      180) /
      Math.PI +
      360) %
    360;

  return {
    distance: Math.round(distance * 100) / 100, // round to cm
    initialBearing: Math.round(initialBearing * 10) / 10,
    finalBearing: Math.round(finalBearing * 10) / 10,
  };
}

/**
 * Format distance in meters with automatic unit conversion (m or km)
 */
export function formatDistance(meters: number): string {
  if (isNaN(meters) || meters < 0) return '0.00 m';
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km.toFixed(2)} km (${meters.toFixed(1)} m)`;
  }
  return `${meters.toFixed(2)} m`;
}

/**
 * Compact distance format for table / tags
 */
export function formatDistanceCompact(meters: number): string {
  if (isNaN(meters) || meters < 0) return '0 m';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters.toFixed(1)} m`;
}
