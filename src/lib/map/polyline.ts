export type PolylinePoint = { lat: number; lng: number };

/**
 * Decode a Google encoded polyline to lat/lng points (precision 5).
 */
export function decodePolyline(
  encoded: string,
  precision = 5,
): PolylinePoint[] {
  if (!encoded) return [];
  const factor = 10 ** precision;
  const points: PolylinePoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const decodeChunk = () => {
    let result = 0;
    let shift = 0;
    let byte = 0;
    do {
      if (index >= encoded.length) return null;
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    const dLat = decodeChunk();
    const dLng = decodeChunk();
    if (dLat === null || dLng === null) break;
    lat += dLat;
    lng += dLng;
    points.push({ lat: lat / factor, lng: lng / factor });
  }

  return points;
}

function encodeSigned(value: number): string {
  let n = value < 0 ? ~(value << 1) : value << 1;
  let encoded = "";
  while (n >= 0x20) {
    encoded += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
    n >>= 5;
  }
  encoded += String.fromCharCode(n + 63);
  return encoded;
}

/** Google encoded polyline (default precision 5). Used by tests. */
export function encodePolyline(
  points: PolylinePoint[],
  precision = 5,
): string {
  const factor = 10 ** precision;
  let encoded = "";
  let prevLat = 0;
  let prevLng = 0;

  for (const point of points) {
    const lat = Math.round(point.lat * factor);
    const lng = Math.round(point.lng * factor);
    encoded += encodeSigned(lat - prevLat);
    encoded += encodeSigned(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }

  return encoded;
}
