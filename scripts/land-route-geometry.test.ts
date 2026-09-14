import { describe, expect, it } from "vitest";
import {
  decodePolyline,
  encodePolyline,
  perpendicularDistanceMeters,
  simplifyDouglasPeucker,
} from "./land-route-geometry.mjs";

describe("encodePolyline", () => {
  it("matches Google's documented sample", () => {
    const encoded = encodePolyline([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
    expect(encoded).toBe("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
  });

  it("round-trips coordinates at precision 5", () => {
    const points = [
      { lat: 51.5074, lng: -0.1278 },
      { lat: 51.515, lng: -0.09 },
      { lat: 51.5033, lng: -0.1195 },
    ];
    const decoded = decodePolyline(encodePolyline(points));
    expect(decoded).toHaveLength(points.length);
    decoded.forEach((point, index) => {
      expect(point.lat).toBeCloseTo(points[index]!.lat, 5);
      expect(point.lng).toBeCloseTo(points[index]!.lng, 5);
    });
  });
});

describe("simplifyDouglasPeucker", () => {
  it("drops a colinear midpoint", () => {
    const simplified = simplifyDouglasPeucker(
      [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 0.01 },
        { lat: 0, lng: 0.02 },
      ],
      5,
    );
    expect(simplified).toEqual([
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0.02 },
    ]);
  });

  it("keeps a point that sits well off the chord", () => {
    const start = { lat: 51.5, lng: -0.12 };
    const detour = { lat: 51.52, lng: -0.08 };
    const end = { lat: 51.5, lng: -0.04 };
    expect(perpendicularDistanceMeters(detour, start, end)).toBeGreaterThan(1000);

    const simplified = simplifyDouglasPeucker([start, detour, end], 50);
    expect(simplified).toEqual([start, detour, end]);
  });

  it("returns short paths unchanged", () => {
    const pair = [
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
    ];
    expect(simplifyDouglasPeucker(pair, 10)).toEqual(pair);
    expect(simplifyDouglasPeucker(pair.slice(0, 1), 10)).toEqual(pair.slice(0, 1));
  });
});
