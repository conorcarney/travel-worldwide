export type LatLngTuple = [number, number];

/**
 * Build a quadratic curve between two points, bowing to the left of
 * travel direction so A→B and B→A take opposite arcs.
 */
export function curveSegment(
  from: LatLngTuple,
  to: LatLngTuple,
  options: { segments?: number; curvature?: number } = {},
): LatLngTuple[] {
  const segments = options.segments ?? 24;
  const curvature = options.curvature ?? 0.22;
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;

  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const distance = Math.hypot(dLat, dLng);

  if (distance < 1e-9) {
    return [from, to];
  }

  // Unit perpendicular to the left of the travel direction.
  const offsetLat = (-dLng / distance) * distance * curvature;
  const offsetLng = (dLat / distance) * distance * curvature;
  const control: LatLngTuple = [
    (lat1 + lat2) / 2 + offsetLat,
    (lng1 + lng2) / 2 + offsetLng,
  ];

  const points: LatLngTuple[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const oneMinusT = 1 - t;
    points.push([
      oneMinusT * oneMinusT * lat1 +
        2 * oneMinusT * t * control[0] +
        t * t * lat2,
      oneMinusT * oneMinusT * lng1 +
        2 * oneMinusT * t * control[1] +
        t * t * lng2,
    ]);
  }

  return points;
}

/** Curve each consecutive pair in a path (e.g. departure → connecting → arrival). */
export function curveFlightPath(
  path: LatLngTuple[],
  options?: { segments?: number; curvature?: number },
): LatLngTuple[] {
  if (path.length < 2) return path;

  const curved: LatLngTuple[] = [];
  for (let i = 0; i < path.length - 1; i += 1) {
    const segment = curveSegment(path[i]!, path[i + 1]!, options);
    if (i > 0) {
      curved.push(...segment.slice(1));
    } else {
      curved.push(...segment);
    }
  }
  return curved;
}
