import { describe, expect, it, vi } from "vitest";
import {
  encodeExistingLine,
  encodeSurfaceRoute,
  type LandRouteRouters,
} from "@/lib/land-routes-encode";
import { decodePolyline } from "@/lib/map/polyline";
import type { SurfaceRouteWriteInput } from "@/lib/validations/surface-route-write";

const dublinHolyhead: SurfaceRouteWriteInput = {
  departure: "Dublin",
  arrival: "Holyhead",
  departure_latitude: 53.3498,
  departure_longitude: -6.2603,
  arrival_latitude: 53.3092,
  arrival_longitude: -4.6328,
  type: "Ferry",
  date: "10/01/2012",
  tags: "Ireland",
  media: "",
};

function failingRouters(): LandRouteRouters {
  return {
    routeOsrm: vi.fn(async () => {
      throw new Error("OSRM down");
    }),
    routeRail: vi.fn(async () => {
      throw new Error("no rail");
    }),
    routeFerry: vi.fn(async () => {
      throw new Error("no ferry");
    }),
  };
}

describe("encodeExistingLine", () => {
  it("stores a two-point polyline for the admin coordinates", () => {
    const encoded = encodeExistingLine(dublinHolyhead);
    expect(encoded.source).toBe("existing");
    expect(encoded.type).toBe("Ferry");
    const path = decodePolyline(encoded.route.geometry);
    expect(path[0]?.lat).toBeCloseTo(53.3498, 4);
    expect(path.at(-1)?.lng).toBeCloseTo(-4.6328, 4);
    expect(encoded.fromTerminal?.name).toBe("Dublin");
    expect(encoded.toTerminal?.name).toBe("Holyhead");
  });
});

describe("encodeSurfaceRoute", () => {
  it("uses OSRM geometry for car and bus trips", async () => {
    const routers: LandRouteRouters = {
      ...failingRouters(),
      routeOsrm: async () => ({
        points: [
          { lat: 51.5074, lng: -0.1278 },
          { lat: 51.51, lng: -0.1 },
          { lat: 51.515, lng: -0.09 },
        ],
        distance: 4200,
        duration: 600,
      }),
    };
    const encoded = await encodeSurfaceRoute(
      { ...dublinHolyhead, type: "Car" },
      routers,
    );
    expect(encoded.source).toBe("osrm");
    expect(encoded.route.distance).toBe(4200);
    expect(encoded.route.duration).toBe(600);
    expect(decodePolyline(encoded.route.geometry).length).toBeGreaterThan(1);
  });

  it("uses OSRM geometry for bus trips", async () => {
    const routers: LandRouteRouters = {
      ...failingRouters(),
      routeOsrm: async () => ({
        points: [
          { lat: -14.07, lng: -75.73 },
          { lat: -13.0, lng: -76.4 },
          { lat: -12.06, lng: -77.02 },
        ],
        distance: 320_000,
        duration: 18_000,
      }),
    };
    const encoded = await encodeSurfaceRoute(
      { ...dublinHolyhead, type: "Bus", departure: "Ica", arrival: "Lima" },
      routers,
    );
    expect(encoded.source).toBe("osrm");
    expect(encoded.route.distance).toBe(320_000);
  });

  it("uses OpenRailRouting geometry for train trips", async () => {
    const routers: LandRouteRouters = {
      ...failingRouters(),
      routeRail: async () => ({
        points: [
          { lat: 53.2159, lng: 6.5698 },
          { lat: 51.0, lng: 10.0 },
          { lat: 48.1409, lng: 11.5741 },
        ],
        distance: 800_000,
        duration: 28_800,
      }),
    };
    const encoded = await encodeSurfaceRoute(
      { ...dublinHolyhead, type: "Train", departure: "Groningen", arrival: "Munich" },
      routers,
    );
    expect(encoded.source).toBe("openrail");
    expect(encoded.route.distance).toBe(800_000);
  });

  it("uses OSM ferry geometry when a route is found", async () => {
    const routers: LandRouteRouters = {
      ...failingRouters(),
      routeFerry: async () => ({
        points: [
          { lat: 53.3498, lng: -6.2603 },
          { lat: 53.33, lng: -5.4 },
          { lat: 53.3092, lng: -4.6328 },
        ],
        distance: 110_000,
        duration: 11_700,
        fromTerminal: { lat: 53.345, lng: -6.2, name: "Dublin Ferry Terminal" },
        toTerminal: { lat: 53.31, lng: -4.63, name: "Holyhead" },
      }),
    };
    const encoded = await encodeSurfaceRoute(dublinHolyhead, routers);
    expect(encoded.source).toBe("osm-ferry");
    expect(encoded.fromTerminal?.name).toBe("Dublin Ferry Terminal");
    expect(encoded.toTerminal?.name).toBe("Holyhead");
  });

  it("falls back to the existing line when routing fails", async () => {
    const encoded = await encodeSurfaceRoute(dublinHolyhead, failingRouters());
    expect(encoded.source).toBe("existing");
    expect(encoded.route.geometry).toBe(
      encodeExistingLine(dublinHolyhead).route.geometry,
    );
  });
});
