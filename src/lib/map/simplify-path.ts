import { haversineKm } from "@/lib/map/distance";

export type PathPoint = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_000;

function toRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function projectedDistanceToSegment(
  point: PathPoint,
  start: PathPoint,
  end: PathPoint,
  clamp: boolean,
) {
  const lat0 = toRad(start.lat);
  const toX = (lng: number) => toRad(lng) * Math.cos(lat0) * EARTH_RADIUS_M;
  const toY = (lat: number) => toRad(lat) * EARTH_RADIUS_M;
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

function perpendicularDistanceMeters(
  point: PathPoint,
  start: PathPoint,
  end: PathPoint,
) {
  return projectedDistanceToSegment(point, start, end, false);
}

export function pathLengthMeters(path: PathPoint[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const from = path[i]!;
    const to = path[i + 1]!;
    total += haversineKm([from.lat, from.lng], [to.lat, to.lng]) * 1000;
  }
  return total;
}

export function distancePointToSegmentMeters(
  point: PathPoint,
  start: PathPoint,
  end: PathPoint,
) {
  return projectedDistanceToSegment(point, start, end, true);
}

/** Shortest distance from a point to a polyline, in metres. */
export function distancePointToPathMeters(
  point: PathPoint,
  path: PathPoint[],
) {
  if (path.length === 0) return Number.POSITIVE_INFINITY;
  if (path.length === 1) {
    return haversineKm(
      [point.lat, point.lng],
      [path[0]!.lat, path[0]!.lng],
    ) * 1000;
  }
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < path.length - 1; i += 1) {
    min = Math.min(
      min,
      distancePointToSegmentMeters(point, path[i]!, path[i + 1]!),
    );
  }
  return min;
}

/** Douglas-Peucker simplification. Always keeps the first and last points. */
export function simplifyDouglasPeucker(
  points: PathPoint[],
  epsilonMeters: number,
): PathPoint[] {
  if (points.length <= 2) return points.slice();

  function simplifyRange(start: number, end: number): PathPoint[] {
    let maxDistance = 0;
    let maxIndex = -1;
    const first = points[start]!;
    const last = points[end]!;
    for (let i = start + 1; i < end; i += 1) {
      const distance = perpendicularDistanceMeters(points[i]!, first, last);
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
