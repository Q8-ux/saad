export interface GeoPoint { latitude: number; longitude: number; }

const EARTH_RADIUS_M = 6_371_000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function evaluateLocationRisk(input: {
  distanceM: number;
  geofenceM: number;
  accuracyM?: number;
  maxAccuracyM: number;
  mockLocationDetected?: boolean;
  deviceIntegrity?: string;
  locationAgeSeconds?: number;
}): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (input.distanceM > input.geofenceM) {
    score += 65;
    reasons.push('OUTSIDE_GEOFENCE');
  }

  if (input.accuracyM == null) {
    score += 15;
    reasons.push('GPS_ACCURACY_MISSING');
  } else if (input.accuracyM > input.maxAccuracyM) {
    score += 25;
    reasons.push('GPS_ACCURACY_POOR');
  }

  if (input.mockLocationDetected) {
    score += 80;
    reasons.push('MOCK_LOCATION_DETECTED');
  }

  if (input.deviceIntegrity && input.deviceIntegrity !== 'TRUSTED') {
    score += 40;
    reasons.push('DEVICE_INTEGRITY_FAILED');
  }

  if (input.locationAgeSeconds != null && input.locationAgeSeconds > 120) {
    score += 20;
    reasons.push('STALE_LOCATION');
  }

  return { score: Math.min(score, 100), reasons };
}
