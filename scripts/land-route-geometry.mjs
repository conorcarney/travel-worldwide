/** @typedef {{ lat: number, lng: number }} LatLng */

const EARTH_RADIUS_M = 6_371_000;

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance in metres.
 * @param {LatLng} from
 * @param {LatLng} to
 */
export function haversineMeters(from, to) {
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Sum of great-circle lengths along a path.
 * @param {LatLng[]} path
 */
export function pathLengthMeters(path) {
  let total = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    total += haversineMeters(path[i], path[i + 1]);
  }
  return total;
}

function projectedDistanceToSegment(point, start, end, clamp) {
  const lat0 = toRad(start.lat);
  const toX = (lng) => toRad(lng) * Math.cos(lat0) * EARTH_RADIUS_M;
  const toY = (lat) => toRad(lat) * EARTH_RADIUS_M;

  const x0 = toX(start.lng);
  const y0 = toY(start.lat);
  const x1 = toX(end.lng);
  const y1 = toY(end.lat);
  const x = toX(point.lng);
  const y = toY(point.lat);

  const dx = x1 - x0;
  const dy = y1 - y0;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-6) {
    return Math.hypot(x - x0, y - y0);
  }

  let t = ((x - x0) * dx + (y - y0) * dy) / lengthSq;
  if (clamp) t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy));
}

/**
 * Perpendicular distance from `point` to the line through `start` and `end`,
 * in metres, using a local equirectangular projection.
 * @param {LatLng} point
 * @param {LatLng} start
 * @param {LatLng} end
 */
export function perpendicularDistanceMeters(point, start, end) {
  return projectedDistanceToSegment(point, start, end, false);
}

/**
 * Distance from `point` to the closest location on the segment, in metres.
 * @param {LatLng} point
 * @param {LatLng} start
 * @param {LatLng} end
 */
export function distancePointToSegmentMeters(point, start, end) {
  return projectedDistanceToSegment(point, start, end, true);
}

/**
 * Shortest distance from a point to a polyline, in metres.
 * @param {LatLng} point
 * @param {LatLng[]} path
 */
export function distancePointToPathMeters(point, path) {
  if (path.length === 0) return Number.POSITIVE_INFINITY;
  if (path.length === 1) return haversineMeters(point, path[0]);
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < path.length - 1; i += 1) {
    min = Math.min(
      min,
      distancePointToSegmentMeters(point, path[i], path[i + 1]),
    );
  }
  return min;
}

/**
 * Douglas-Peucker simplification. Always keeps the first and last points.
 * @param {LatLng[]} points
 * @param {number} epsilonMeters
 * @returns {LatLng[]}
 */
export function simplifyDouglasPeucker(points, epsilonMeters) {
  if (points.length <= 2) return points.slice();

  /** @param {number} start @param {number} end */
  function simplifyRange(start, end) {
    let maxDistance = 0;
    let maxIndex = -1;
    const first = points[start];
    const last = points[end];

    for (let i = start + 1; i < end; i += 1) {
      const distance = perpendicularDistanceMeters(points[i], first, last);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    if (maxDistance > epsilonMeters && maxIndex !== -1) {
      const left = simplifyRange(start, maxIndex);
      const right = simplifyRange(maxIndex, end);
      return left.concat(right.slice(1));
    }

    return [first, last];
  }

  return simplifyRange(0, points.length - 1);
}

/**
 * Encode a signed integer using Google's polyline algorithm.
 * @param {number} value
 */
function encodeSigned(value) {
  let n = value < 0 ? ~(value << 1) : value << 1;
  let encoded = "";
  while (n >= 0x20) {
    encoded += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
    n >>= 5;
  }
  encoded += String.fromCharCode(n + 63);
  return encoded;
}

/**
 * Google encoded polyline (default precision 5).
 * @param {LatLng[]} points
 * @param {number} [precision]
 */
export function encodePolyline(points, precision = 5) {
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

/**
 * Decode a Google encoded polyline back to coordinates.
 * @param {string} encoded
 * @param {number} [precision]
 * @returns {LatLng[]}
 */
export function decodePolyline(encoded, precision = 5) {
  const factor = 10 ** precision;
  /** @type {LatLng[]} */
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const decodeChunk = () => {
    let result = 0;
    let shift = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += decodeChunk();
    lng += decodeChunk();
    points.push({ lat: lat / factor, lng: lng / factor });
  }

  return points;
}
