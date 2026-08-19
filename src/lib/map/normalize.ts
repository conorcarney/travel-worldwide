import {
  mongoBlogSchema,
  mongoBookmarkCollectionSchema,
  mongoFlightSchema,
  mongoSurfaceRouteSchema,
  mongoVisitedSchema,
  type MapBookmark,
  type MapRoute,
  type MongoVisited,
  type TravelMode,
} from "@/lib/validations/map-data";
import { curveFlightPath } from "@/lib/map/flight-curve";
import { pathDistanceKm } from "@/lib/map/distance";

const MODE_FROM_TYPE: Record<string, TravelMode> = {
  Bus: "bus",
  Train: "train",
  Ferry: "ferry",
  Car: "car",
};

/** Parse Flights "lng, lat" coordinate strings into Leaflet [lat, lng]. */
export function parseLngLatString(value: string): [number, number] | null {
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) {
    return null;
  }
  const [lng, lat] = parts;
  return [lat, lng];
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
      path,
      distanceKm: pathDistanceKm(path),
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
