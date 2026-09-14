import { encodePolyline } from "@/lib/map/polyline";
import { pathLengthMeters, simplifyDouglasPeucker } from "@/lib/map/simplify-path";
import type { SurfaceRouteWriteInput } from "@/lib/validations/surface-route-write";

export const LAND_ROUTES_COLLECTION = "LandRoutes";
export const ENCODE_EPSILON_M = 30;
export const FERRY_SPEED_KMH = 25;
export const TRAIN_SPEED_KMH = 80;

export type LatLng = { lat: number; lng: number };

export type EncodedRouteSource = "osrm" | "openrail" | "osm-ferry" | "existing";

export type EncodedLandRouteFields = {
  departure: LatLng;
  arrival: LatLng;
  date: string;
  tags: string;
  type: SurfaceRouteWriteInput["type"];
  route: {
    geometry: string;
    distance: number;
    duration: number;
  };
  fromTerminal?: { lat: number; lng: number; name: string };
  toTerminal?: { lat: number; lng: number; name: string };
};

export type EncodedLandRouteResult = EncodedLandRouteFields & {
  source: EncodedRouteSource;
};

export type RoutedPath = {
  points: LatLng[];
  distance: number;
  duration: number;
  name?: string;
  fromTerminal?: { lat: number; lng: number; name?: string };
  toTerminal?: { lat: number; lng: number; name?: string };
};

export type LandRouteRouters = {
  routeOsrm: (from: LatLng, to: LatLng) => Promise<RoutedPath>;
  routeRail: (
    from: LatLng,
    to: LatLng,
    fromName: string,
    toName: string,
  ) => Promise<RoutedPath>;
  routeFerry: (
    from: LatLng,
    to: LatLng,
    fromName: string,
    toName: string,
  ) => Promise<RoutedPath>;
};

function durationFromSpeed(points: LatLng[], kmh: number): number {
  const meters = pathLengthMeters(points);
  return Math.round((meters / 1000 / kmh) * 3600);
}

export function encodeExistingLine(
  input: SurfaceRouteWriteInput,
): EncodedLandRouteResult {
  const departure = {
    lat: input.departure_latitude,
    lng: input.departure_longitude,
  };
  const arrival = {
    lat: input.arrival_latitude,
    lng: input.arrival_longitude,
  };
  const points = [departure, arrival];
  const distance = Math.round(pathLengthMeters(points));
  const duration = durationFromSpeed(
    points,
    input.type === "Ferry" ? FERRY_SPEED_KMH : TRAIN_SPEED_KMH,
  );
  return {
    departure,
    arrival,
    date: input.date,
    tags: input.tags ?? "",
    type: input.type,
    source: "existing",
    route: {
      geometry: encodePolyline(points),
      distance,
      duration,
    },
    ...(input.type === "Ferry"
      ? {
          fromTerminal: { ...departure, name: input.departure },
          toTerminal: { ...arrival, name: input.arrival },
        }
      : {}),
  };
}

function packRoutedPath(
  input: SurfaceRouteWriteInput,
  routed: RoutedPath,
  source: EncodedRouteSource,
): EncodedLandRouteResult {
  const departure = {
    lat: input.departure_latitude,
    lng: input.departure_longitude,
  };
  const arrival = {
    lat: input.arrival_latitude,
    lng: input.arrival_longitude,
  };
  if (routed.points.length < 2) {
    throw new Error("Routed path is too short");
  }
  const simplified = simplifyDouglasPeucker(routed.points, ENCODE_EPSILON_M);
  const fromName = routed.fromTerminal?.name?.trim() || input.departure;
  const toName = routed.toTerminal?.name?.trim() || input.arrival;
  return {
    departure,
    arrival,
    date: input.date,
    tags: input.tags ?? "",
    type: input.type,
    source,
    route: {
      geometry: encodePolyline(simplified),
      distance: Math.round(routed.distance),
      duration: Math.round(routed.duration),
    },
    ...(input.type === "Ferry"
      ? {
          fromTerminal: routed.fromTerminal
            ? {
                lat: routed.fromTerminal.lat,
                lng: routed.fromTerminal.lng,
                name: fromName,
              }
            : { ...departure, name: fromName },
          toTerminal: routed.toTerminal
            ? {
                lat: routed.toTerminal.lat,
                lng: routed.toTerminal.lng,
                name: toName,
              }
            : { ...arrival, name: toName },
        }
      : {}),
  };
}

/** Encode one admin land route via OSRM, OpenRailRouting, or OSM ferries. */
export async function encodeSurfaceRoute(
  input: SurfaceRouteWriteInput,
  routers: LandRouteRouters,
): Promise<EncodedLandRouteResult> {
  const from = {
    lat: input.departure_latitude,
    lng: input.departure_longitude,
  };
  const to = {
    lat: input.arrival_latitude,
    lng: input.arrival_longitude,
  };

  try {
    if (input.type === "Car" || input.type === "Bus") {
      const routed = await routers.routeOsrm(from, to);
      return packRoutedPath(input, routed, "osrm");
    }
    if (input.type === "Train") {
      const routed = await routers.routeRail(
        from,
        to,
        input.departure,
        input.arrival,
      );
      return packRoutedPath(input, routed, "openrail");
    }
    if (input.type === "Ferry") {
      const routed = await routers.routeFerry(
        from,
        to,
        input.departure,
        input.arrival,
      );
      return packRoutedPath(input, routed, "osm-ferry");
    }
  } catch {
    // Fall through to the existing departure→arrival line.
  }

  return encodeExistingLine(input);
}
