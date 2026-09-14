import {
  ferryMatchEnds,
  parseOsmDuration,
  pickFerryRoute,
  pickNearestFerryTerminal,
  pickNearestStation,
  stitchPolylines,
} from "@/lib/rail-ferry-match";
import { pathLengthMeters } from "@/lib/map/simplify-path";
import type { LandRouteRouters, LatLng, RoutedPath } from "@/lib/land-routes-encode";
import { FERRY_SPEED_KMH } from "@/lib/land-routes-encode";

const DEFAULT_OSRM_URL = "https://router.project-osrm.org";
const DEFAULT_OPENRAIL_URL = "https://routing.openrailrouting.org";
const DEFAULT_OPENRAIL_PROFILE = "all_tracks";
const DEFAULT_OVERPASS_URLS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
const REQUEST_TIMEOUT_MS = 45_000;
const FERRY_SNAP_M = 25_000;
const STATION_RADII_M = [1500, 5000, 15000, 40000];
const FERRY_TERMINAL_RADII_M = [8000, 25000, 80000];
const USER_AGENT = "ahbegrand-land-routes";

type OverpassElement = {
  type?: string;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  geometry?: { lat?: number; lon?: number; lng?: number }[];
  members?: { geometry?: { lat?: number; lon?: number; lng?: number }[] }[];
  tags?: Record<string, string>;
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function overpassUrls() {
  const configured = process.env.OVERPASS_URL?.trim();
  const urls = configured ? [configured] : [];
  for (const url of DEFAULT_OVERPASS_URLS) {
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

function isRetryable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("fetch failed") ||
    message.includes("Timeout") ||
    message.includes("Connect Timeout") ||
    message.startsWith("HTTP 429") ||
    message.startsWith("HTTP 5")
  );
}

async function fetchJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (response.status === 429 || response.status >= 500) {
    throw new Error(`HTTP ${response.status} ${url}`);
  }
  if (!response.ok) {
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : `HTTP ${response.status}`;
    throw new Error(message.split("\n")[0] ?? message);
  }
  return payload;
}

async function overpass(query: string) {
  let lastError: unknown = new Error("Overpass request failed");
  for (const url of overpassUrls()) {
    try {
      return (await fetchJson(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: new URLSearchParams({ data: query }),
      })) as { elements?: OverpassElement[] };
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function geometryFromOverpass(
  geometry: OverpassElement["geometry"],
): LatLng[] {
  if (!Array.isArray(geometry)) return [];
  const path: LatLng[] = [];
  for (const node of geometry) {
    const lat = asFiniteNumber(node?.lat);
    const lng = asFiniteNumber(node?.lon ?? node?.lng);
    if (lat === null || lng === null) continue;
    path.push({ lat, lng });
  }
  return path;
}

function elementPoint(el: OverpassElement): LatLng | null {
  const lat = asFiniteNumber(el.lat ?? el.center?.lat);
  const lng = asFiniteNumber(el.lon ?? el.center?.lon);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function coordinatesFromGeoJson(geometry: unknown): LatLng[] {
  if (
    !geometry ||
    typeof geometry !== "object" ||
    !("coordinates" in geometry) ||
    !Array.isArray((geometry as { coordinates: unknown }).coordinates)
  ) {
    throw new Error("Route geometry is missing LineString coordinates");
  }
  const coordinates = (geometry as { coordinates: unknown[] }).coordinates;
  return coordinates.map((pair, index) => {
    if (!Array.isArray(pair) || pair.length < 2) {
      throw new Error(`Coordinate ${index} is invalid`);
    }
    const lng = asFiniteNumber(pair[0]);
    const lat = asFiniteNumber(pair[1]);
    if (lat === null || lng === null) {
      throw new Error(`Coordinate ${index} is not numeric`);
    }
    return { lat, lng };
  });
}

function paddedBbox(from: LatLng, to: LatLng, padDeg: number) {
  return {
    south: Math.max(-90, Math.min(from.lat, to.lat) - padDeg),
    north: Math.min(90, Math.max(from.lat, to.lat) + padDeg),
    west: Math.min(from.lng, to.lng) - padDeg,
    east: Math.max(from.lng, to.lng) + padDeg,
  };
}

function durationFromFerry(path: LatLng[], taggedSeconds: number | null) {
  if (taggedSeconds != null && taggedSeconds > 0) return taggedSeconds;
  const meters = pathLengthMeters(path);
  return Math.round((meters / 1000 / FERRY_SPEED_KMH) * 3600);
}

async function routeOsrm(from: LatLng, to: LatLng): Promise<RoutedPath> {
  const origin = (process.env.OSRM_URL ?? DEFAULT_OSRM_URL).replace(/\/+$/, "");
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${origin}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
  const payload = (await fetchJson(url)) as {
    code?: string;
    routes?: { geometry?: unknown; distance?: number; duration?: number }[];
  };
  if (payload.code !== "Ok" || !payload.routes?.[0]) {
    throw new Error(`OSRM ${payload.code ?? "Unknown"}`);
  }
  const route = payload.routes[0];
  const points = coordinatesFromGeoJson(route.geometry);
  if (points.length < 2) throw new Error("OSRM geometry is too short");
  return {
    points,
    distance: Number(route.distance) || pathLengthMeters(points),
    duration: Math.round(Number(route.duration) || 0),
  };
}

async function nearestStation(point: LatLng) {
  for (const radius of STATION_RADII_M) {
    const query = `[out:json][timeout:25];
(
  node["railway"="station"](around:${radius},${point.lat},${point.lng});
  node["railway"="halt"](around:${radius},${point.lat},${point.lng});
);
out body;`;
    const payload = await overpass(query);
    const stations = (payload.elements ?? [])
      .filter((el) => el.type === "node")
      .map((el) => {
        const at = elementPoint(el);
        if (!at) return null;
        return {
          ...at,
          name: el.tags?.name,
          railway: el.tags?.railway,
          station: el.tags?.station,
          usage: el.tags?.usage,
          train: el.tags?.train,
          subway: el.tags?.subway,
          uic_ref: el.tags?.uic_ref,
        };
      })
      .filter((el): el is NonNullable<typeof el> => el !== null);
    const picked = pickNearestStation(stations, point);
    if (picked) return picked;
  }
  throw new Error("No nearby railway station/halt");
}

async function routeOpenRail(from: LatLng, to: LatLng): Promise<RoutedPath> {
  const openrailUrl = (process.env.OPENRAIL_URL ?? DEFAULT_OPENRAIL_URL).replace(
    /\/+$/,
    "",
  );
  const profile = process.env.OPENRAIL_PROFILE ?? DEFAULT_OPENRAIL_PROFILE;
  const url = new URL(`${openrailUrl}/route`);
  url.searchParams.append("point", `${from.lat},${from.lng}`);
  url.searchParams.append("point", `${to.lat},${to.lng}`);
  url.searchParams.set("profile", profile);
  url.searchParams.set("points_encoded", "false");
  url.searchParams.set("instructions", "false");
  url.searchParams.set("calc_points", "true");
  const payload = (await fetchJson(url.toString())) as {
    paths?: { points?: unknown; distance?: number; time?: number }[];
  };
  const route = payload.paths?.[0];
  if (!route) throw new Error("OpenRailRouting returned no path");
  const points = coordinatesFromGeoJson(route.points);
  if (points.length < 2) throw new Error("OpenRailRouting path is too short");
  return {
    points,
    distance: Number(route.distance) || pathLengthMeters(points),
    duration: Math.round((Number(route.time) || 0) / 1000),
  };
}

async function routeRail(
  from: LatLng,
  to: LatLng,
  _fromName: string,
  _toName: string,
): Promise<RoutedPath> {
  const fromStation = await nearestStation(from);
  const toStation = await nearestStation(to);
  return routeOpenRail(fromStation, toStation);
}

function parseFerryElements(payload: { elements?: OverpassElement[] }) {
  const candidates: {
    path: LatLng[];
    duration: number | null;
    name: string;
    from: string;
    to: string;
  }[] = [];
  for (const el of payload.elements ?? []) {
    const name = el.tags?.name ?? "";
    const fromName = el.tags?.from ?? "";
    const toName = el.tags?.to ?? "";
    const duration = parseOsmDuration(el.tags?.duration);
    if (el.type === "way") {
      candidates.push({
        path: geometryFromOverpass(el.geometry),
        duration,
        name,
        from: fromName,
        to: toName,
      });
      continue;
    }
    if (el.type === "relation" && Array.isArray(el.members)) {
      const parts = el.members
        .map((member) => geometryFromOverpass(member.geometry))
        .filter((part) => part.length >= 2);
      const path = stitchPolylines(parts);
      if (path.length >= 2) {
        candidates.push({
          path,
          duration,
          name,
          from: fromName,
          to: toName,
        });
      }
    }
  }
  return candidates;
}

async function nearestFerryTerminal(point: LatLng, placeName: string) {
  for (const radius of FERRY_TERMINAL_RADII_M) {
    const query = `[out:json][timeout:25];
(
  node["amenity"="ferry_terminal"](around:${radius},${point.lat},${point.lng});
  way["amenity"="ferry_terminal"](around:${radius},${point.lat},${point.lng});
  relation["amenity"="ferry_terminal"](around:${radius},${point.lat},${point.lng});
  node["public_transport"="station"]["ferry"="yes"](around:${radius},${point.lat},${point.lng});
  node["public_transport"="stop_position"]["ferry"="yes"](around:${radius},${point.lat},${point.lng});
);
out center;`;
    const payload = await overpass(query);
    const terminals = (payload.elements ?? [])
      .map((el) => {
        const at = elementPoint(el);
        if (!at) return null;
        return {
          ...at,
          name: el.tags?.name ?? el.tags?.["name:en"] ?? "",
          amenity: el.tags?.amenity,
          ferry: el.tags?.ferry,
          public_transport: el.tags?.public_transport,
        };
      })
      .filter((el): el is NonNullable<typeof el> => el !== null);
    const picked = pickNearestFerryTerminal(terminals, point, placeName);
    if (picked) return picked;
  }
  return null;
}

async function routeFerry(
  from: LatLng,
  to: LatLng,
  fromName: string,
  toName: string,
): Promise<RoutedPath> {
  const fromTerminal =
    (await nearestFerryTerminal(from, fromName)) ?? { ...from, name: fromName };
  const toTerminal =
    (await nearestFerryTerminal(to, toName)) ?? { ...to, name: toName };
  const matchEnds = ferryMatchEnds(from, to, fromTerminal, toTerminal);
  const placeNames = { from: fromName, to: toName };
  const aroundPoints = matchEnds.collapsed
    ? [from, to, fromTerminal, toTerminal]
    : [fromTerminal, toTerminal];
  const arounds = aroundPoints.map(
    (point) =>
      `  way["route"="ferry"](around:${FERRY_SNAP_M},${point.lat},${point.lng});
  relation["route"="ferry"](around:${FERRY_SNAP_M},${point.lat},${point.lng});`,
  );
  let candidates = parseFerryElements(
    await overpass(`[out:json][timeout:45];
(
${arounds.join("\n")}
);
out geom;`),
  );
  const pickFrom = (list: typeof candidates) =>
    pickFerryRoute(list, matchEnds.from, matchEnds.to, FERRY_SNAP_M, placeNames) ??
    pickFerryRoute(list, from, to, FERRY_SNAP_M, placeNames);
  let picked = pickFrom(candidates);
  if (!picked || picked.path.length < 2) {
    const bbox = paddedBbox(from, to, 0.4);
    candidates = parseFerryElements(
      await overpass(`[out:json][timeout:45];
(
  way["route"="ferry"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  relation["route"="ferry"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out geom;`),
    );
    picked = pickFrom(candidates);
  }
  if (!picked || picked.path.length < 2) {
    throw new Error("No OSM ferry way near both terminals");
  }
  return {
    points: picked.path,
    distance: pathLengthMeters(picked.path),
    duration: durationFromFerry(picked.path, picked.duration),
    name: picked.name,
    fromTerminal,
    toTerminal,
  };
}

export function createDefaultLandRouteRouters(): LandRouteRouters {
  return {
    routeOsrm,
    routeRail,
    routeFerry,
  };
}
