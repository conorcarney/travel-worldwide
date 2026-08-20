import { describe, expect, it } from "vitest";
import { toSurfaceRouteDocument } from "@/lib/surface-routes";
import { surfaceRouteWriteSchema } from "@/lib/validations/surface-route-write";

describe("surfaceRouteWriteSchema", () => {
  const valid = {
    departure: "Groningen",
    arrival: "Munich",
    departure_longitude: 6.56982422,
    departure_latitude: 53.21588495,
    arrival_longitude: 11.57409668,
    arrival_latitude: 48.14087441,
    type: "Train",
    date: "01/11/2013",
  };

  it("defaults tags to an empty string", () => {
    const parsed = surfaceRouteWriteSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tags).toBe("");
    }
  });

  it("coerces coordinate strings to numbers", () => {
    const parsed = surfaceRouteWriteSchema.safeParse({
      ...valid,
      departure_longitude: "6.57",
      departure_latitude: "53.21",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.departure_longitude).toBeCloseTo(6.57);
      expect(parsed.data.departure_latitude).toBeCloseTo(53.21);
    }
  });

  it("rejects unknown transport types", () => {
    expect(
      surfaceRouteWriteSchema.safeParse({ ...valid, type: "Plane" }).success,
    ).toBe(false);
  });
});

describe("toSurfaceRouteDocument", () => {
  it("maps write input to the Mongo document shape", () => {
    expect(
      toSurfaceRouteDocument({
        departure: "Ica",
        arrival: "Lima",
        departure_longitude: -75.73,
        departure_latitude: -14.07,
        arrival_longitude: -77.02,
        arrival_latitude: -12.06,
        type: "Bus",
        date: "27/02/2019",
        tags: "Andes",
      }),
    ).toEqual({
      departure: "Ica",
      arrival: "Lima",
      departure_longitude: -75.73,
      departure_latitude: -14.07,
      arrival_longitude: -77.02,
      arrival_latitude: -12.06,
      type: "Bus",
      date: "27/02/2019",
      tags: "Andes",
    });
  });
});
