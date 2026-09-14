import { describe, expect, it } from "vitest";
import { decodePolyline, encodePolyline } from "@/lib/map/polyline";

describe("decodePolyline", () => {
  it("decodes Google's documented sample", () => {
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
  });

  it("returns an empty path for a blank string", () => {
    expect(decodePolyline("")).toEqual([]);
  });
});

describe("encodePolyline", () => {
  it("round-trips coordinates at precision 5", () => {
    const points = [
      { lat: 51.5074, lng: -0.1278 },
      { lat: 51.515, lng: -0.09 },
    ];
    const decoded = decodePolyline(encodePolyline(points));
    expect(decoded).toHaveLength(points.length);
    decoded.forEach((point, index) => {
      expect(point.lat).toBeCloseTo(points[index]!.lat, 5);
      expect(point.lng).toBeCloseTo(points[index]!.lng, 5);
    });
  });
});
