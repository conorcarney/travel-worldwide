import { haversineKm } from "@/lib/map/distance";
import type { LatLngTuple } from "@/lib/map/flight-curve";
import { shortestLngDelta } from "@/lib/map/lng";

export type JourneySample = {
  position: LatLngTuple;
  bearing: number;
  traveled: LatLngTuple[];
};

export const PLAYBACK_SPEEDS = [
  { id: "slowest", label: "Slowest", multiplier: 0.25 },
  { id: "slow", label: "Slow", multiplier: 0.5 },
  { id: "normal", label: "Normal", multiplier: 1 },
  { id: "fast", label: "Fast", multiplier: 2 },
  { id: "fastest", label: "Fastest", multiplier: 4 },
] as const;

export type PlaybackSpeedId = (typeof PLAYBACK_SPEEDS)[number]["id"];

export function playbackSpeedMultiplier(id: PlaybackSpeedId): number {
  return PLAYBACK_SPEEDS.find((speed) => speed.id === id)?.multiplier ?? 1;
}

/** True when `tags` contains the given label (comma-separated, case-insensitive). */
export function hasRouteTag(tags: string | undefined, tag: string): boolean {
  const needle = tag.trim().toLowerCase();
  if (!needle) return false;
  return parseRouteTags(tags).some((part) => part.toLowerCase() === needle);
}

export function parseRouteTags(tags: string | undefined): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const part of (tags ?? "").split(",")) {
    const label = part.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
}

export function collectRouteTags(routes: { tags?: string }[]): string[] {
  const byKey = new Map<string, string>();
  for (const route of routes) {
    for (const tag of parseRouteTags(route.tags)) {
      const key = tag.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, tag);
    }
  }
  return [...byKey.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

export function filterRoutesByTag<T extends { tags?: string }>(
  routes: T[],
  tag: string,
): T[] {
  return filterRoutesByTags(routes, tag ? [tag] : []);
}

/** Keep routes that have at least one of the selected tags. Empty means all. */
export function filterRoutesByTags<T extends { tags?: string }>(
  routes: T[],
  selected: string[],
): T[] {
  const needles = selected.map((tag) => tag.trim()).filter(Boolean);
  if (needles.length === 0) return routes;
  return routes.filter((route) =>
    needles.some((tag) => hasRouteTag(route.tags, tag)),
  );
}

const MIN_DURATION_MS = 900;
const MAX_DURATION_MS = 2600;
const BASE_DURATION_MS = 750;
const MS_PER_KM = 0.28;
const MIN_SCALED_DURATION_MS = 220;

/** Animation length that stays watchable for short hops and long-haul flights. */
export function journeyDurationMs(
  distanceKm: number,
  speed: number = 1,
): number {
  const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
  let base = MIN_DURATION_MS;
  if (Number.isFinite(distanceKm) && distanceKm > 0) {
    base = Math.min(
      MAX_DURATION_MS,
      Math.max(MIN_DURATION_MS, BASE_DURATION_MS + distanceKm * MS_PER_KM),
    );
  }
  return Math.max(MIN_SCALED_DURATION_MS, Math.round(base / safeSpeed));
}

/** Zoom in past a fitted route so follow-cam stays close to the vehicle. */
export function followZoom(boundsZoom: number, zoomOut = 0): number {
  const extra = Number.isFinite(zoomOut) ? Math.max(0, zoomOut) : 0;
  if (!Number.isFinite(boundsZoom)) return Math.max(2, 12 - extra);
  const close = Math.min(16, Math.max(9, Math.round(boundsZoom) + 7));
  return Math.max(2, close - extra);
}

/**
 * CSS transform that keeps Leaflet's pan and rotates the map so `bearing`
 * (0° north, clockwise) faces the top of the viewport.
 * `pitch` tilts the map into a chase-cam view (degrees around X).
 */
export function headingPaneTransform(
  pos: { x: number; y: number },
  size: { x: number; y: number },
  bearing: number,
  pitch = 0,
): string {
  const cx = size.x / 2 - pos.x;
  const cy = size.y / 2 - pos.y;
  const angle = -bearing;
  const pan = `translate3d(${pos.x}px, ${pos.y}px, 0px)`;
  const toCenter = `translate(${cx}px, ${cy}px)`;
  const fromCenter = `translate(${-cx}px, ${-cy}px)`;
  if (pitch <= 0) {
    return `${pan} ${toCenter} rotate(${angle}deg) ${fromCenter}`;
  }
  const pitchRad = (pitch * Math.PI) / 180;
  const scale = 1 / Math.max(0.42, Math.cos(pitchRad)) * 1.06;
  const yShift = size.y * 0.18;
  return `translateY(${yShift}px) ${pan} ${toCenter} rotateX(${pitch}deg) rotateZ(${angle}deg) scale(${scale}) ${fromCenter}`;
}

/** Chase-cam tilt while a journey is followed. */
export const FOLLOW_PITCH_DEG = 52;

/** Keep the vehicle on the route and fully in front of the map surface. */
export function vehicleFollowTransform(bearing: number, pitch = 0): string {
  if (pitch <= 0) return `rotate(${bearing}deg)`;
  return `rotate(${bearing}deg)`;
}

/**
 * Extra tile padding so a rotated map still has OSM tiles in the corners.
 * `pad(ratio)` grows each side by `ratio` of the viewport, so the loaded
 * square covers the viewport diagonal at any heading.
 */
export function rotationTilePadRatio(
  size: { x: number; y: number },
  pitchDeg = 0,
): number {
  const width = Math.max(1, size.x);
  const height = Math.max(1, size.y);
  const rotScale = Math.hypot(width, height) / Math.min(width, height);
  const pitchScale =
    1 / Math.max(0.4, Math.cos((Math.max(0, pitchDeg) * Math.PI) / 180));
  return (rotScale * pitchScale - 1) / 2 + 0.08;
}

/** Initial bearing 0° is north, clockwise, matching CSS rotate on a north-facing icon. */
export function geographicBearing(from: LatLngTuple, to: LatLngTuple): number {
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  if (Math.abs(dLat) < 1e-12 && Math.abs(dLng) < 1e-12) return 0;

  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(shortestLngDelta(lng1, lng2));
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = (Math.atan2(y, x) * 180) / Math.PI;
  return (θ + 360) % 360;
}

function lerp(from: LatLngTuple, to: LatLngTuple, t: number): LatLngTuple {
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
  ];
}

/**
 * Position, heading, and drawn trail at progress `t` (0–1) along a path,
 * paced by great-circle segment length.
 */
export function interpolateJourney(
  path: LatLngTuple[],
  t: number,
): JourneySample {
  const clamped = Math.min(1, Math.max(0, t));
  const start = path[0] ?? [0, 0];

  if (path.length < 2) {
    return { position: start, bearing: 0, traveled: [start] };
  }

  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const length = haversineKm(path[i]!, path[i + 1]!);
    lengths.push(length);
    total += length;
  }

  if (total < 1e-9) {
    const end = path[path.length - 1] ?? start;
    return { position: end, bearing: 0, traveled: [start, end] };
  }

  const target = clamped * total;
  let accumulated = 0;

  for (let i = 0; i < lengths.length; i += 1) {
    const segment = lengths[i]!;
    const from = path[i]!;
    const to = path[i + 1]!;
    const atEnd = i === lengths.length - 1;
    if (accumulated + segment >= target || atEnd) {
      const localT = segment < 1e-9 ? 1 : (target - accumulated) / segment;
      const position = lerp(from, to, Math.min(1, Math.max(0, localT)));
      const traveled = [...path.slice(0, i + 1), position];
      return {
        position,
        bearing: geographicBearing(from, to),
        traveled,
      };
    }
    accumulated += segment;
  }

  const end = path[path.length - 1]!;
  return {
    position: end,
    bearing: geographicBearing(path[path.length - 2]!, end),
    traveled: path,
  };
}

/** Smallest signed turn from one compass bearing to another, in (-180, 180]. */
export function shortestAngleDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

export function lerpAngle(from: number, to: number, t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return (from + shortestAngleDelta(from, to) * clamped + 360) % 360;
}

export function lerpLatLng(
  from: LatLngTuple,
  to: LatLngTuple,
  t: number,
): LatLngTuple {
  const u = Math.min(1, Math.max(0, t));
  return [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u];
}

export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/** Camera handoff between consecutive journeys, scaled by playback speed. */
export function bridgeDurationMs(speed = 1): number {
  const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
  return Math.max(500, Math.round(1600 / safeSpeed));
}

export type FollowCameraState = {
  position: LatLngTuple;
  bearing: number;
};

export function expSmooth(
  current: number,
  target: number,
  dtMs: number,
  tauMs: number,
): number {
  if (tauMs <= 0) return target;
  const alpha = 1 - Math.exp(-Math.max(0, dtMs) / tauMs);
  return current + (target - current) * alpha;
}

export function expSmoothAngle(
  current: number,
  target: number,
  dtMs: number,
  tauMs: number,
): number {
  if (tauMs <= 0) return target;
  const alpha = 1 - Math.exp(-Math.max(0, dtMs) / tauMs);
  return lerpAngle(current, target, alpha);
}

export function expSmoothLatLng(
  current: LatLngTuple,
  target: LatLngTuple,
  dtMs: number,
  tauMs: number,
): LatLngTuple {
  return [
    expSmooth(current[0], target[0], dtMs, tauMs),
    expSmooth(current[1], target[1], dtMs, tauMs),
  ];
}

/**
 * Follow-cam sample: vehicle on the path, bearing from a chord ahead so
 * curved flight polylines do not twitch at every tiny segment.
 */
export function followCameraTarget(
  path: LatLngTuple[],
  t: number,
  tangentSpan = 0.08,
): JourneySample {
  const sample = interpolateJourney(path, t);
  const span = Math.min(0.25, Math.max(0.02, tangentSpan));
  const ahead = interpolateJourney(path, Math.min(1, t + span));
  const [lat1, lng1] = sample.position;
  const [lat2, lng2] = ahead.position;
  if (Math.abs(lat2 - lat1) < 1e-9 && Math.abs(lng2 - lng1) < 1e-9) {
    return sample;
  }
  return {
    ...sample,
    bearing: geographicBearing(sample.position, ahead.position),
  };
}
