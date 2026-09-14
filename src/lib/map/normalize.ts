import {
  mongoBlogSchema,
  mongoBookmarkCollectionSchema,
  mongoFlightSchema,
  mongoLandRouteSchema,
  mongoSurfaceRouteSchema,
  mongoVisitedSchema,
  type MapBookmark,
  type MapRoute,
  type MongoVisited,
  type TravelMode,
} from "@/lib/validations/map-data";
import { curveFlightPath } from "@/lib/map/flight-curve";
import { pathDistanceKm } from "@/lib/map/distance";
import { decodePolyline } from "@/lib/map/polyline";

const MODE_FROM_TYPE: Record<string, TravelMode> = {
  Bus: "bus",
  Train: "train",
  Ferry: "ferry",
  Car: "car",
};

/** Parse a "a, b" pair into two numbers. */
function parseCoordPair(value: string): [number, number] | null {
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) {
    return null;
  }
  return [parts[0]!, parts[1]!];
}

/** Parse Flights "lng, lat" coordinate strings into Leaflet [lat, lng]. */
export function parseLngLatString(value: string): [number, number] | null {
  const pair = parseCoordPair(value);
  if (!pair) return null;
  const [lng, lat] = pair;
  return [lat, lng];
}

/** Parse land-route form "lat, lng" strings into Leaflet [lat, lng]. */
export function parseLatLngString(value: string): [number, number] | null {
  return parseCoordPair(value);
}

function isFiniteCoord(value: unknown): value is number | string {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string" && value.trim() !== "") {
    return Number.isFinite(Number(value));
  }
  return false;
}

/** Format stored lng/lat for display. Mongo may hold either numbers or numeric strings. */
export function formatLngLatString(lng: unknown, lat: unknown): string {
  if (!isFiniteCoord(lng) || !isFiniteCoord(lat)) return "";
  return `${lng}, ${lat}`;
}

/** Format stored lat/lng for the land-routes admin form. */
export function formatLatLngString(lat: unknown, lng: unknown): string {
  if (!isFiniteCoord(lat) || !isFiniteCoord(lng)) return "";
  return `${lat}, ${lng}`;
}

function docId(value: unknown, fallback: string): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return fallback;
}

export function normalizeFlights(data: unknown[]): MapRoute[] {
  const routes: MapRoute[] = [];

  data.forEach((item, index) => {
    const parsed = mongoFlightSchema.safeParse(item);
    if (!parsed.success) return;

    const flight = parsed.data;
    const path: [number, number][] = [];

    const departure = parseLngLatString(flight.departure_coordinates);
    if (departure) path.push(departure);

    if (flight.connecting_coordinates?.trim()) {
      const connecting = parseLngLatString(flight.connecting_coordinates);
      if (connecting) path.push(connecting);
    }

    const arrival = parseLngLatString(flight.arrival_coordinates);
    if (arrival) path.push(arrival);

    if (path.length < 2) return;

    routes.push({
      id: docId(flight._id, `flight-${index}`),
      mode: "flight",
      from: flight.departure,
      to: flight.arrival,
      date: flight.date,
      tags: flight.tags ?? "",
      media: flight.media ?? "",
      // Distance uses real waypoints; display path is curved for the map.
      distanceKm: pathDistanceKm(path),
      path: curveFlightPath(path),
    });
  });

  return routes;
}

export function normalizeSurfaceRoutes(data: unknown[]): MapRoute[] {
  const routes: MapRoute[] = [];

  data.forEach((item, index) => {
    const parsed = mongoSurfaceRouteSchema.safeParse(item);
    if (!parsed.success) return;

    const route = parsed.data;
    const mode = MODE_FROM_TYPE[route.type];
    if (!mode) return;

    const path: [number, number][] = [
      [route.departure_latitude, route.departure_longitude],
      [route.arrival_latitude, route.arrival_longitude],
    ];

    routes.push({
      id: docId(route._id, `surface-${index}`),
      mode,
      from: route.departure,
      to: route.arrival,
      date: route.date,
      tags: route.tags ?? "",
      media: route.media ?? "",
      path,
      distanceKm: pathDistanceKm(path),
    });
  });

  return routes;
}

export type EncodedLandRoute = {
  id: string;
  path: [number, number][];
  distance: number;
  duration: number;
  date: string;
  tags: string;
  type: "Car" | "Bus" | "Train" | "Ferry" | "";
  fromTerminal: string;
  toTerminal: string;
};

export type EncodedOverlayKind = "road" | "train" | "ferry";

export function encodedOverlayKind(route: EncodedLandRoute): EncodedOverlayKind {
  if (route.type === "Train") return "train";
  if (route.type === "Ferry") return "ferry";
  return "road";
}

/** Decode batch-encoded LandRoutes documents into Leaflet paths. */
export function normalizeLandRoutes(data: unknown[]): EncodedLandRoute[] {
  const routes: EncodedLandRoute[] = [];

  data.forEach((item, index) => {
    const parsed = mongoLandRouteSchema.safeParse(item);
    if (!parsed.success) return;

    const decoded = decodePolyline(parsed.data.route.geometry);
    const path: [number, number][] = decoded.map((point) => [
      point.lat,
      point.lng,
    ]);
    if (path.length < 2) return;

    routes.push({
      id: docId(parsed.data._id, `land-${index}`),
      path,
      distance: parsed.data.route.distance,
      duration: parsed.data.route.duration,
      date: parsed.data.date ?? "",
      tags: parsed.data.tags ?? "",
      type: parsed.data.type ?? "",
      fromTerminal: parsed.data.fromTerminal?.name?.trim() ?? "",
      toTerminal: parsed.data.toTerminal?.name?.trim() ?? "",
    });
  });

  return routes;
}

export function normalizeBookmarks(data: unknown[]): MapBookmark[] {
  const bookmarks: MapBookmark[] = [];

  data.forEach((item, docIndex) => {
    const parsed = mongoBookmarkCollectionSchema.safeParse(item);
    if (!parsed.success) return;

    const collection = parsed.data;
    collection.features.forEach((feature, featureIndex) => {
      const [lng, lat] = feature.geometry.coordinates;
      bookmarks.push({
        id: `${docId(collection._id, `bm-${docIndex}`)}-${featureIndex}`,
        name: feature.properties.Name?.trim() || "Untitled place",
        date: feature.properties.timestamp?.trim() || "",
        lat,
        lng,
      });
    });
  });

  return bookmarks;
}

export function normalizeVisited(data: unknown[]): MongoVisited[] {
  return data.flatMap((item) => {
    const parsed = mongoVisitedSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function normalizeBlogs(data: unknown[]) {
  return data.flatMap((item) => {
    const parsed = mongoBlogSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export const ROUTE_COLORS: Record<TravelMode, string> = {
  flight: "#e85d4c",
  ferry: "#3b82f6",
  bus: "#f59e0b",
  train: "#a855f7",
  car: "#14b8a6",
};

/** Overlay colour for detailed car/bus LandRoutes — same as the Cars layer. */
export const ENCODED_ROUTE_COLOR = ROUTE_COLORS.car;
/** Overlay colour for detailed train paths — same as the Trains layer. */
export const ENCODED_TRAIN_COLOR = ROUTE_COLORS.train;
/** Overlay colour for detailed ferry paths — same as the Ferries layer. */
export const ENCODED_FERRY_COLOR = ROUTE_COLORS.ferry;

const EXISTING_TRAIN_SPEED_KMH = 80;
const EXISTING_FERRY_SPEED_KMH = 25;

/** Straight-line LandRoutes stand-in from the live train/ferry layer. */
export function encodedFromExistingRoute(
  route: MapRoute,
  type: "Train" | "Ferry",
): EncodedLandRoute {
  const kmh = type === "Ferry" ? EXISTING_FERRY_SPEED_KMH : EXISTING_TRAIN_SPEED_KMH;
  return {
    id: route.id,
    path: route.path,
    distance: Math.round(route.distanceKm * 1000),
    duration: Math.round((route.distanceKm / kmh) * 3600),
    date: route.date,
    tags: route.tags ?? "",
    type,
    fromTerminal: route.from,
    toTerminal: route.to,
  };
}

/** OSM-encoded overlays, plus existing train/ferry paths when none were matched. */
export function mergeEncodedWithExisting(
  encoded: EncodedLandRoute[],
  surface: MapRoute[],
): {
  road: EncodedLandRoute[];
  train: EncodedLandRoute[];
  ferry: EncodedLandRoute[];
} {
  const road: EncodedLandRoute[] = [];
  const train: EncodedLandRoute[] = [];
  const ferry: EncodedLandRoute[] = [];
  const encodedIds = new Set(encoded.map((route) => route.id));

  for (const route of encoded) {
    const kind = encodedOverlayKind(route);
    if (kind === "train") train.push(route);
    else if (kind === "ferry") ferry.push(route);
    else road.push(route);
  }

  for (const route of surface) {
    if (encodedIds.has(route.id)) continue;
    if (route.mode === "train") {
      train.push(encodedFromExistingRoute(route, "Train"));
    } else if (route.mode === "ferry") {
      ferry.push(encodedFromExistingRoute(route, "Ferry"));
    }
  }

  return { road, train, ferry };
}

export function flattenEncodedOverlays(overlays: {
  road: EncodedLandRoute[];
  train: EncodedLandRoute[];
  ferry: EncodedLandRoute[];
}): EncodedLandRoute[] {
  return [...overlays.road, ...overlays.train, ...overlays.ferry];
}

/** Replace straight-line land paths with matching detailed geometry. */
export function applyDetailedGeometry(
  routes: MapRoute[],
  encoded: EncodedLandRoute[],
): MapRoute[] {
  if (encoded.length === 0) return routes;
  const byId = new Map(encoded.map((item) => [item.id, item]));
  return routes.map((route) => {
    const detailed = byId.get(route.id);
    if (!detailed || detailed.path.length < 2) return route;
    const distanceKm =
      detailed.distance > 0
        ? detailed.distance / 1000
        : pathDistanceKm(detailed.path);
    return { ...route, path: detailed.path, distanceKm };
  });
}

export function detailedOverlayForMode(
  mode: TravelMode,
): EncodedOverlayKind | null {
  if (mode === "train") return "train";
  if (mode === "ferry") return "ferry";
  if (mode === "car" || mode === "bus") return "road";
  return null;
}

export function detailedColorForMode(mode: TravelMode): string | null {
  if (!detailedOverlayForMode(mode)) return null;
  return ROUTE_COLORS[mode];
}
