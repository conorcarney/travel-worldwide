import type { MapRoute, TravelMode } from "@/lib/validations/map-data";

const EARTH_RADIUS_KM = 6371;

const TRAVEL_MODES: TravelMode[] = [
  "flight",
  "bus",
  "train",
  "ferry",
  "car",
];

/** Great-circle distance between two Leaflet [lat, lng] points. */
export function haversineKm(
  from: [number, number],
  to: [number, number],
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const a =
    sinDLat * sinDLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Sum great-circle lengths along a path of [lat, lng] points. */
export function pathDistanceKm(path: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    total += haversineKm(path[i], path[i + 1]);
  }
  return total;
}

export type ModeTravelStats = {
  mode: TravelMode;
  count: number;
  distanceKm: number;
};

export type TravelStatsSummary = {
  byMode: ModeTravelStats[];
  totalCount: number;
  totalDistanceKm: number;
};

function emptyModeStats(): ModeTravelStats[] {
  return TRAVEL_MODES.map((mode) => ({
    mode,
    count: 0,
    distanceKm: 0,
  }));
}

/** Aggregate trip counts and distances by transport mode. */
export function summarizeTravelStats(routes: MapRoute[]): TravelStatsSummary {
  const byMode = emptyModeStats();
  const index = Object.fromEntries(
    byMode.map((entry, i) => [entry.mode, i]),
  ) as Record<TravelMode, number>;

  for (const route of routes) {
    const entry = byMode[index[route.mode]];
    entry.count += 1;
    entry.distanceKm += route.distanceKm;
  }

  return {
    byMode,
    totalCount: byMode.reduce((sum, entry) => sum + entry.count, 0),
    totalDistanceKm: byMode.reduce((sum, entry) => sum + entry.distanceKm, 0),
  };
}

export function formatDistanceKm(km: number): string {
  const rounded = km >= 100 ? Math.round(km) : Math.round(km * 10) / 10;
  return `${rounded.toLocaleString("en-GB")} km`;
}
