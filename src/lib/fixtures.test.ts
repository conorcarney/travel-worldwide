import { describe, expect, it } from "vitest";
import { fixtures } from "@/lib/fixtures";
import {
  normalizeBookmarks,
  normalizeFlights,
  normalizeSurfaceRoutes,
  normalizeVisited,
} from "@/lib/map/normalize";

describe("fixtures integrate with normalizers", () => {
  it("produces usable map features from fixture documents", () => {
    expect(normalizeVisited(fixtures.visited).length).toBeGreaterThan(0);
    expect(normalizeFlights(fixtures.flights).length).toBeGreaterThan(0);
    expect(
      normalizeSurfaceRoutes(fixtures.busesTrainsAndFerries).length,
    ).toBeGreaterThan(0);
    expect(
      normalizeBookmarks(fixtures.mapsMeBookmarks).length,
    ).toBeGreaterThan(0);
  });
});
