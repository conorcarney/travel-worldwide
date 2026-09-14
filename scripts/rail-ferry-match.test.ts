import { describe, expect, it } from "vitest";
import { haversineMeters, pathLengthMeters } from "./land-route-geometry.mjs";
import {
  ferryTerminalScore,
  ferryMatchEnds,
  namesOverlap,
  orientPath,
  parseOsmDuration,
  pickFerryRoute,
  pickNearestFerryTerminal,
  pickNearestStation,
  slicePathBetween,
  stationScore,
  stitchPolylines,
} from "./rail-ferry-match.mjs";

describe("parseOsmDuration", () => {
  it("reads HH:MM clock values as seconds", () => {
    expect(parseOsmDuration("03:15")).toBe(3 * 3600 + 15 * 60);
    expect(parseOsmDuration("0:20")).toBe(20 * 60);
  });

  it("treats a bare number as minutes", () => {
    expect(parseOsmDuration("45")).toBe(45 * 60);
  });

  it("returns null for empty values", () => {
    expect(parseOsmDuration("")).toBeNull();
    expect(parseOsmDuration(null)).toBeNull();
  });
});

describe("pickNearestStation", () => {
  const origin = { lat: 48.1403, lng: 11.5583 };

  it("prefers a slightly farther mainline station over subway", () => {
    const subway = {
      lat: 48.1294,
      lng: 11.5741,
      name: "Fraunhoferstraße",
      railway: "station",
      station: "subway",
    };
    const hbf = {
      lat: 48.1402,
      lng: 11.5585,
      name: "München Hbf",
      railway: "station",
    };
    expect(stationScore(hbf, origin)).toBeLessThan(stationScore(subway, origin));
    expect(pickNearestStation([subway, hbf], origin)?.name).toBe("München Hbf");
  });

  it("prefers a UIC mainline station over a closer S-Bahn stop", () => {
    const sBahn = {
      lat: 48.1372,
      lng: 11.5755,
      name: "Marienplatz",
      railway: "station",
    };
    const hbf = {
      lat: 48.1403,
      lng: 11.5583,
      name: "München Hbf",
      railway: "station",
      usage: "main",
      uic_ref: "8020347",
      train: "yes",
    };
    const city = { lat: 48.137, lng: 11.575 };
    expect(pickNearestStation([sBahn, hbf], city)?.name).toBe("München Hbf");
  });
});

describe("ferry path helpers", () => {
  const holyhead = { lat: 53.3092, lng: -4.6328 };
  const dublin = { lat: 53.3498, lng: -6.2603 };
  const path = [
    { lat: 53.3183, lng: -4.6209 },
    { lat: 53.33, lng: -5.4 },
    { lat: 53.345, lng: -6.1961 },
  ];

  it("reverses a path that runs towards the origin", () => {
    const reversed = [...path].reverse();
    expect(orientPath(reversed, holyhead, dublin)[0]?.lng).toBeCloseTo(-4.6209, 3);
  });

  it("picks the ferry that passes near both terminals", () => {
    const other = [
      { lat: 51.0, lng: 1.0 },
      { lat: 51.1, lng: 1.2 },
    ];
    const picked = pickFerryRoute(
      [
        { path: other, name: "other", duration: 600 },
        { path, name: "Dublin - Holyhead", duration: 11700 },
      ],
      holyhead,
      dublin,
      25_000,
    );
    expect(picked?.name).toBe("Dublin - Holyhead");
    expect(picked?.duration).toBe(11700);
    expect(picked?.path.length).toBeGreaterThan(1);
  });

  it("rejects a short local ferry when the trip is much longer", () => {
    const rio = { lat: -22.907, lng: -43.209 };
    const ilha = { lat: -23.142, lng: -44.166 };
    const local = [
      { lat: -23.04, lng: -44.0 },
      { lat: -23.14, lng: -44.16 },
    ];
    const picked = pickFerryRoute(
      [{ path: local, name: "Mangaratiba-Ilha Grande" }],
      rio,
      ilha,
      25_000,
      { from: "Rio de Janeiro", to: "Ihla Grande" },
    );
    expect(picked).toBeNull();
  });

  it("slices to the segment between the two terminals", () => {
    const sliced = slicePathBetween(path, holyhead, dublin);
    expect(sliced[0]).toEqual(path[0]);
    expect(sliced.at(-1)).toEqual(path.at(-1));
  });

  it("joins way fragments that share an endpoint", () => {
    const left = [
      { lat: 50.95, lng: 1.85 },
      { lat: 51.0, lng: 1.5 },
    ];
    const right = [
      { lat: 51.0, lng: 1.5 },
      { lat: 51.12, lng: 1.32 },
    ];
    const stitched = stitchPolylines([right, left]);
    expect(stitched[0]).toEqual(left[0]);
    expect(stitched.at(-1)).toEqual(right.at(-1));
    expect(stitched).toHaveLength(3);
  });
});

describe("pickNearestFerryTerminal", () => {
  const calais = { lat: 50.9518, lng: 1.8732 };

  it("prefers a named ferry terminal over a closer unnamed pier", () => {
    const pier = { lat: 50.952, lng: 1.873, name: "" };
    const terminal = {
      lat: 50.967,
      lng: 1.863,
      name: "Calais Ferry Terminal",
      amenity: "ferry_terminal",
    };
    expect(ferryTerminalScore(terminal, calais, "Calais")).toBeLessThan(
      ferryTerminalScore(pier, calais, "Calais"),
    );
    expect(
      pickNearestFerryTerminal([pier, terminal], calais, "Calais")?.name,
    ).toBe("Calais Ferry Terminal");
  });

  it("prefers the vehicle terminal over a pedestrian or cruise berth", () => {
    const pedestrian = {
      lat: 50.952,
      lng: 1.873,
      name: "Calais, Poste 9 Piétons",
      amenity: "ferry_terminal",
    };
    const vehicle = {
      lat: 50.967,
      lng: 1.863,
      name: "Calais Ferry Terminal",
      amenity: "ferry_terminal",
    };
    expect(
      pickNearestFerryTerminal([pedestrian, vehicle], calais, "Calais")?.name,
    ).toBe("Calais Ferry Terminal");
  });

  it("matches misspelled island names by shared tokens", () => {
    expect(namesOverlap("Ihla Grande", "Ilha Grande ferry terminal")).toBe(
      true,
    );
    expect(namesOverlap("Ko Phangan", "Koh Phangan Pier")).toBe(true);
  });

  it("falls back to trip coordinates when both ends snap to the same pier", () => {
    const puertoLopez = { lat: -1.561, lng: -80.814 };
    const isla = { lat: -1.269, lng: -81.066 };
    const samePier = { lat: -1.562, lng: -80.815, name: "Muelle de Fibras" };
    const ends = ferryMatchEnds(puertoLopez, isla, samePier, samePier);
    expect(ends.collapsed).toBe(true);
    expect(ends.from).toEqual(puertoLopez);
    expect(ends.to).toEqual(isla);
  });
});

describe("haversineMeters", () => {
  it("is zero for the same point", () => {
    const p = { lat: 53.35, lng: -6.26 };
    expect(haversineMeters(p, p)).toBeCloseTo(0, 5);
  });

  it("sums path length", () => {
    const path = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0.01 },
    ];
    expect(pathLengthMeters(path)).toBeGreaterThan(1000);
    expect(pathLengthMeters(path)).toBeLessThan(1300);
  });
});
