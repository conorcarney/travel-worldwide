import { describe, expect, it } from "vitest";
import {
  normalizeBookmarks,
  normalizeFlights,
  normalizeSurfaceRoutes,
  normalizeVisited,
  parseLngLatString,
  ROUTE_COLORS,
} from "@/lib/map/normalize";

describe("parseLngLatString", () => {
  it("converts lng,lat strings to Leaflet [lat, lng]", () => {
    expect(parseLngLatString("-6.2603, 53.3498")).toEqual([53.3498, -6.2603]);
  });

  it("trims whitespace around values", () => {
    expect(parseLngLatString(" 2.1115 , 49.4545 ")).toEqual([49.4545, 2.1115]);
  });

  it("returns null for empty or incomplete values", () => {
    expect(parseLngLatString("")).toBeNull();
    expect(parseLngLatString("1")).toBeNull();
    expect(parseLngLatString("abc, def")).toBeNull();
  });
});

describe("normalizeFlights", () => {
  const directFlight = {
    _id: "flight-1",
    departure: "Dublin",
    arrival: "Paris Beauvais",
    connecting: "",
    date: "19/01/2023",
    departure_coordinates: "-6.2603, 53.3498",
    connecting_coordinates: "",
    arrival_coordinates: "2.1115, 49.4545",
  };

  it("normalizes a direct flight path", () => {
    const [route] = normalizeFlights([directFlight]);
    expect(route).toMatchObject({
      id: "flight-1",
      mode: "flight",
      from: "Dublin",
      to: "Paris Beauvais",
      date: "19/01/2023",
    });
    expect(route.path[0]).toEqual([53.3498, -6.2603]);
    expect(route.path.at(-1)).toEqual([49.4545, 2.1115]);
    // Curved flights insert intermediate points.
    expect(route.path.length).toBeGreaterThan(2);
    expect(route.distanceKm).toBeGreaterThan(700);
    expect(route.distanceKm).toBeLessThan(750);
  });

  it("includes connecting stop when coordinates are present", () => {
    const connectingFlight = {
      ...directFlight,
      _id: "flight-2",
      connecting: "Brasilia",
      connecting_coordinates: "-47.9172, -15.8697",
    };

    const [route] = normalizeFlights([connectingFlight]);
    expect(route.path.length).toBeGreaterThan(3);
    expect(route.path.some(([lat, lng]) => lat === -15.8697 && lng === -47.9172)).toBe(
      true,
    );
  });

  it("skips invalid documents and unusable coordinates", () => {
    expect(
      normalizeFlights([
        { not: "a flight" },
        {
          ...directFlight,
          departure_coordinates: "bad",
          arrival_coordinates: "also-bad",
        },
      ]),
    ).toEqual([]);
  });

  it("falls back to index-based id when _id is missing", () => {
    const { _id: _ignored, ...withoutId } = directFlight;
    expect(normalizeFlights([withoutId])[0]?.id).toBe("flight-0");
  });
});

describe("normalizeSurfaceRoutes", () => {
  const train = {
    _id: "surface-1",
    departure: "Groningen",
    departure_longitude: 6.56982422,
    departure_latitude: 53.21588495,
    arrival: "Munich",
    arrival_longitude: 11.57409668,
    arrival_latitude: 48.14087441,
    type: "Train",
    date: "01/11/2013",
  };

  it("maps each transport type to the correct mode and path", () => {
    const routes = normalizeSurfaceRoutes([
      train,
      { ...train, _id: "bus-1", type: "Bus" },
      { ...train, _id: "ferry-1", type: "Ferry" },
      { ...train, _id: "car-1", type: "Car" },
    ]);

    expect(routes.map((route) => route.mode)).toEqual([
      "train",
      "bus",
      "ferry",
      "car",
    ]);
    expect(routes[0]).toMatchObject({
      id: "surface-1",
      from: "Groningen",
      to: "Munich",
      date: "01/11/2013",
      path: [
        [53.21588495, 6.56982422],
        [48.14087441, 11.57409668],
      ],
    });
    expect(routes[0].distanceKm).toBeGreaterThan(500);
  });

  it("skips invalid surface routes", () => {
    expect(
      normalizeSurfaceRoutes([{ type: "Train", departure: "Only half" }]),
    ).toEqual([]);
  });

  it("accepts string coordinates from Atlas", () => {
    const [route] = normalizeSurfaceRoutes([
      {
        ...train,
        departure_longitude: "6.56982422",
        departure_latitude: "53.21588495",
        arrival_longitude: "11.57409668",
        arrival_latitude: "48.14087441",
      },
    ]);

    expect(route).toMatchObject({
      mode: "train",
      from: "Groningen",
      to: "Munich",
    });
    expect(route.path[0]).toEqual([53.21588495, 6.56982422]);
  });
});

describe("normalizeBookmarks", () => {
  const collection = {
    _id: "bm-doc",
    type: "FeatureCollection",
    name: "My Places",
    features: [
      {
        type: "Feature",
        properties: {
          Name: "  Temple Bar  ",
          description: null,
          timestamp: "2018/06/03 12:00:00+00",
        },
        geometry: {
          type: "Point",
          coordinates: [-6.2672, 53.3456],
        },
      },
      {
        type: "Feature",
        properties: {
          Name: null,
          description: null,
          timestamp: null,
        },
        geometry: {
          type: "Point",
          coordinates: [2.1744, 41.4036],
        },
      },
    ],
  };

  it("flattens GeoJSON FeatureCollections into map bookmarks", () => {
    expect(normalizeBookmarks([collection])).toEqual([
      {
        id: "bm-doc-0",
        name: "Temple Bar",
        date: "2018/06/03 12:00:00+00",
        lat: 53.3456,
        lng: -6.2672,
      },
      {
        id: "bm-doc-1",
        name: "Untitled place",
        date: "",
        lat: 41.4036,
        lng: 2.1744,
      },
    ]);
  });

  it("skips non FeatureCollection documents", () => {
    expect(normalizeBookmarks([{ name: "not geojson" }])).toEqual([]);
  });
});

describe("normalizeVisited", () => {
  it("keeps valid visited countries and drops invalid ones", () => {
    expect(
      normalizeVisited([
        { _id: "1", name: "Ireland" },
        {
          name: "Spain",
          date: "2019-08-12",
          other_visit_dates: "03/2022, 19/01/2023",
        },
        { iso2: "FR" },
      ]),
    ).toEqual([
      { _id: "1", name: "Ireland" },
      {
        name: "Spain",
        date: "2019-08-12",
        other_visit_dates: "03/2022, 19/01/2023",
      },
    ]);
  });
});

describe("ROUTE_COLORS", () => {
  it("defines a colour for every travel mode", () => {
    expect(Object.keys(ROUTE_COLORS).sort()).toEqual(
      ["bus", "car", "ferry", "flight", "train"].sort(),
    );
    for (const color of Object.values(ROUTE_COLORS)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
