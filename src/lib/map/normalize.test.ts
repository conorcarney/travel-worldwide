import { describe, expect, it } from "vitest";
import {
  applyDetailedGeometry,
  normalizeBookmarks,
  normalizeFlights,
  normalizeLandRoutes,
  encodedOverlayKind,
  mergeEncodedWithExisting,
  normalizeSurfaceRoutes,
  normalizeVisited,
  parseLngLatString,
  parseLatLngString,
  formatLngLatString,
  formatLatLngString,
  ROUTE_COLORS,
  detailedColorForMode,
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

describe("formatLngLatString", () => {
  it("writes lng, lat", () => {
    expect(formatLngLatString(-6.2603, 53.3498)).toBe("-6.2603, 53.3498");
  });

  it("formats numeric strings from Mongo the same way", () => {
    expect(formatLngLatString("48.290025", "38.247557")).toBe(
      "48.290025, 38.247557",
    );
  });

  it("returns empty when a value is missing", () => {
    expect(formatLngLatString("", 53.3498)).toBe("");
    expect(formatLngLatString(-6.2603, undefined)).toBe("");
  });
});

describe("parseLatLngString", () => {
  it("keeps lat,lng strings as Leaflet [lat, lng]", () => {
    expect(parseLatLngString("53.3498, -6.2603")).toEqual([53.3498, -6.2603]);
  });

  it("returns null for empty or incomplete values", () => {
    expect(parseLatLngString("")).toBeNull();
    expect(parseLatLngString("1")).toBeNull();
  });
});

describe("formatLatLngString", () => {
  it("writes lat, lng", () => {
    expect(formatLatLngString(53.3498, -6.2603)).toBe("53.3498, -6.2603");
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

  it("keeps flight tags and media for follow-cam", () => {
    const [route] = normalizeFlights([
      {
        ...directFlight,
        tags: "Work, Long distance",
        media: "https://cdn.example/flight.jpg",
      },
    ]);
    expect(route.tags).toBe("Work, Long distance");
    expect(route.media).toBe("https://cdn.example/flight.jpg");
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

describe("normalizeLandRoutes", () => {
  it("decodes encoded geometry into a Leaflet path", () => {
    const [route] = normalizeLandRoutes([
      {
        _id: "land-1",
        departure: { lat: 38.5, lng: -120.2 },
        arrival: { lat: 43.252, lng: -126.453 },
        route: {
          geometry: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
          distance: 5820,
          duration: 910,
        },
      },
    ]);
    expect(route).toMatchObject({
      id: "land-1",
      distance: 5820,
      duration: 910,
      date: "",
      tags: "",
      type: "",
    });
    expect(route.path[0]).toEqual([38.5, -120.2]);
    expect(route.path.at(-1)).toEqual([43.252, -126.453]);
    expect(route.path.length).toBe(3);
  });

  it("copies date and tags from the stored document", () => {
    const [route] = normalizeLandRoutes([
      {
        _id: "land-2",
        departure: { lat: 38.5, lng: -120.2 },
        arrival: { lat: 43.252, lng: -126.453 },
        date: "27/02/2019",
        tags: "Peru, South America",
        route: {
          geometry: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
          distance: 5820,
          duration: 910,
        },
      },
    ]);
    expect(route).toMatchObject({
      id: "land-2",
      date: "27/02/2019",
      tags: "Peru, South America",
      fromTerminal: "",
      toTerminal: "",
    });
  });

  it("copies snapped ferry terminal names", () => {
    const [route] = normalizeLandRoutes([
      {
        _id: "ferry-term",
        departure: { lat: 50.95, lng: 1.87 },
        arrival: { lat: 51.12, lng: 1.31 },
        type: "Ferry",
        fromTerminal: { lat: 50.967, lng: 1.863, name: "Calais Ferry Terminal" },
        toTerminal: { lat: 51.127, lng: 1.327, name: "Dover Eastern Docks" },
        route: {
          geometry: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
          distance: 42000,
          duration: 5400,
        },
      },
    ]);
    expect(route).toMatchObject({
      fromTerminal: "Calais Ferry Terminal",
      toTerminal: "Dover Eastern Docks",
    });
  });

  it("keeps Car/Bus as the road overlay and splits Train/Ferry", () => {
    const routes = normalizeLandRoutes([
      {
        _id: "car-1",
        departure: { lat: 38.5, lng: -120.2 },
        arrival: { lat: 43.252, lng: -126.453 },
        type: "Car",
        route: {
          geometry: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
          distance: 1,
          duration: 1,
        },
      },
      {
        _id: "train-1",
        departure: { lat: 38.5, lng: -120.2 },
        arrival: { lat: 43.252, lng: -126.453 },
        type: "Train",
        route: {
          geometry: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
          distance: 1,
          duration: 1,
        },
      },
      {
        _id: "ferry-1",
        departure: { lat: 38.5, lng: -120.2 },
        arrival: { lat: 43.252, lng: -126.453 },
        type: "Ferry",
        route: {
          geometry: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
          distance: 1,
          duration: 1,
        },
      },
    ]);
    expect(routes.map((route) => encodedOverlayKind(route))).toEqual([
      "road",
      "train",
      "ferry",
    ]);
  });

  it("fills unmatched trains and ferries from the existing surface routes", () => {
    const existing = {
      departure: "Groningen",
      departure_longitude: 6.56982422,
      departure_latitude: 53.21588495,
      arrival: "Munich",
      arrival_longitude: 11.57409668,
      arrival_latitude: 48.14087441,
      date: "01/11/2013",
    };
    const encoded = normalizeLandRoutes([
      {
        _id: "ferry-matched",
        departure: { lat: 38.5, lng: -120.2 },
        arrival: { lat: 43.252, lng: -126.453 },
        type: "Ferry",
        route: {
          geometry: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
          distance: 1,
          duration: 1,
        },
      },
    ]);
    const surface = normalizeSurfaceRoutes([
      { ...existing, _id: "ferry-matched", type: "Ferry" },
      { ...existing, _id: "ferry-missing", type: "Ferry" },
      { ...existing, _id: "train-missing", type: "Train" },
    ]);
    const merged = mergeEncodedWithExisting(encoded, surface);
    expect(merged.ferry.map((route) => route.id)).toEqual([
      "ferry-matched",
      "ferry-missing",
    ]);
    expect(merged.train.map((route) => route.id)).toEqual(["train-missing"]);
    expect(merged.train[0]?.path).toEqual(surface[2]?.path);
    expect(merged.train[0]?.fromTerminal).toBe("Groningen");
    expect(merged.train[0]?.toTerminal).toBe("Munich");
  });

  it("replaces a surface path with matching detailed geometry", () => {
    const surface = normalizeSurfaceRoutes([
      {
        _id: "bus-1",
        departure: "Ica",
        arrival: "Lima",
        departure_longitude: -75.73,
        departure_latitude: -14.07,
        arrival_longitude: -77.02,
        arrival_latitude: -12.06,
        type: "Bus",
        date: "27/02/2019",
      },
    ]);
    const encoded = normalizeLandRoutes([
      {
        _id: "bus-1",
        departure: { lat: -14.07, lng: -75.73 },
        arrival: { lat: -12.06, lng: -77.02 },
        type: "Bus",
        route: {
          geometry: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
          distance: 320000,
          duration: 18000,
        },
      },
    ]);
    const [detailed] = applyDetailedGeometry(surface, encoded);
    expect(detailed?.path.length).toBeGreaterThan(2);
    expect(detailed?.distanceKm).toBe(320);
    expect(detailed?.from).toBe("Ica");
  });

  it("skips documents with invalid geometry", () => {
    expect(
      normalizeLandRoutes([
        {
          departure: { lat: 1, lng: 2 },
          arrival: { lat: 3, lng: 4 },
          route: { geometry: "", distance: 1, duration: 1 },
        },
      ]),
    ).toEqual([]);
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

  it("uses the same colours for detailed overlays as the mode layers", () => {
    expect(detailedColorForMode("car")).toBe(ROUTE_COLORS.car);
    expect(detailedColorForMode("train")).toBe(ROUTE_COLORS.train);
    expect(detailedColorForMode("ferry")).toBe(ROUTE_COLORS.ferry);
    expect(detailedColorForMode("bus")).toBe(ROUTE_COLORS.bus);
    expect(detailedColorForMode("flight")).toBeNull();
  });
});
