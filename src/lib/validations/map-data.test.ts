import { describe, expect, it } from "vitest";
import {
  mongoBookmarkCollectionSchema,
  mongoFlightSchema,
  mongoSurfaceRouteSchema,
  mongoVisitedSchema,
  mapRouteSchema,
  mapBookmarkSchema,
} from "@/lib/validations/map-data";

describe("mongoFlightSchema", () => {
  it("accepts Atlas flight documents", () => {
    const parsed = mongoFlightSchema.safeParse({
      departure: "Dublin",
      arrival: "Paris Beauvais",
      connecting: "",
      date: "19/01/2023",
      departure_coordinates: "-6.2603, 53.3498",
      connecting_coordinates: "",
      arrival_coordinates: "2.1115, 49.4545",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects flights missing coordinates", () => {
    expect(
      mongoFlightSchema.safeParse({
        departure: "Dublin",
        arrival: "Paris",
        date: "19/01/2023",
      }).success,
    ).toBe(false);
  });
});

describe("mongoSurfaceRouteSchema", () => {
  it("accepts Bus/Train/Ferry/Car routes", () => {
    const parsed = mongoSurfaceRouteSchema.safeParse({
      departure: "Ica",
      departure_longitude: -75.73,
      departure_latitude: -14.07,
      arrival: "Lima",
      arrival_longitude: -77.02,
      arrival_latitude: -12.06,
      type: "Bus",
      date: "27/02/2019",
    });
    expect(parsed.success).toBe(true);
  });

  it("coerces string coordinates from Atlas", () => {
    const parsed = mongoSurfaceRouteSchema.safeParse({
      departure: "Ica",
      departure_longitude: "-75.73",
      departure_latitude: "-14.07",
      arrival: "Lima",
      arrival_longitude: "-77.02",
      arrival_latitude: "-12.06",
      type: "Bus",
      date: "27/02/2019",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.departure_longitude).toBeCloseTo(-75.73);
      expect(parsed.data.departure_latitude).toBeCloseTo(-14.07);
    }
  });

  it("rejects unknown transport types", () => {
    expect(
      mongoSurfaceRouteSchema.safeParse({
        departure: "A",
        departure_longitude: 0,
        departure_latitude: 0,
        arrival: "B",
        arrival_longitude: 1,
        arrival_latitude: 1,
        type: "Spaceship",
        date: "01/01/2020",
      }).success,
    ).toBe(false);
  });
});

describe("mongoVisitedSchema", () => {
  it("requires a country name and allows optional dates", () => {
    expect(mongoVisitedSchema.safeParse({ name: "Ireland" }).success).toBe(
      true,
    );
    expect(
      mongoVisitedSchema.safeParse({
        name: "Spain",
        date: "06/2018",
        other_visit_dates: "08/2020, 03/2022",
      }).success,
    ).toBe(true);
    expect(mongoVisitedSchema.safeParse({ iso2: "IE" }).success).toBe(false);
  });
});

describe("mongoBookmarkCollectionSchema", () => {
  it("accepts MAPS.ME FeatureCollection documents", () => {
    const parsed = mongoBookmarkCollectionSchema.safeParse({
      type: "FeatureCollection",
      name: "My Places",
      features: [
        {
          type: "Feature",
          properties: { Name: "Temple Bar", timestamp: "2018/06/03 12:00:00+00" },
          geometry: { type: "Point", coordinates: [-6.2672, 53.3456] },
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("map feature schemas", () => {
  it("validates normalized routes and bookmarks", () => {
    expect(
      mapRouteSchema.safeParse({
        id: "1",
        mode: "flight",
        from: "A",
        to: "B",
        date: "01/01/2020",
        path: [
          [1, 2],
          [3, 4],
        ],
        distanceKm: 100,
      }).success,
    ).toBe(true);

    expect(
      mapBookmarkSchema.safeParse({
        id: "1",
        name: "Place",
        date: "",
        lat: 1,
        lng: 2,
      }).success,
    ).toBe(true);
  });
});
