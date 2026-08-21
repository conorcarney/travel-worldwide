import { describe, expect, it } from "vitest";
import {
  DEFAULT_LAYERS,
  buildMapFilterQuery,
  clampFilterRange,
  parseMapFilterSearch,
  parseYearMonthParam,
} from "@/lib/map/filter-url";

describe("parseYearMonthParam", () => {
  it("reads YYYY-MM", () => {
    expect(parseYearMonthParam("2019-08")).toEqual({ year: 2019, month: 8 });
  });

  it("rejects junk", () => {
    expect(parseYearMonthParam("Aug 2019")).toBeNull();
    expect(parseYearMonthParam("2019-13")).toBeNull();
  });
});

describe("parseMapFilterSearch", () => {
  it("applies hide and show on top of defaults", () => {
    const parsed = parseMapFilterSearch(
      new URLSearchParams("hide=flight,visited&show=bookmarks&tag=Work"),
    );
    expect(parsed.tags).toEqual(["Work"]);
    expect(parsed.layers.flight).toBe(false);
    expect(parsed.layers.visited).toBe(false);
    expect(parsed.layers.bookmarks).toBe(true);
    expect(parsed.layers.bus).toBe(true);
  });

  it("reads multiple tag params", () => {
    expect(
      parseMapFilterSearch(new URLSearchParams("tag=Work&tag=Family")).tags,
    ).toEqual(["Work", "Family"]);
  });
});

describe("buildMapFilterQuery", () => {
  const boundsMin = { year: 2000, month: 1 };
  const boundsMax = { year: 2027, month: 12 };

  it("omits defaults so a full-range view is a bare path", () => {
    expect(
      buildMapFilterQuery({
        from: boundsMin,
        to: boundsMax,
        boundsMin,
        boundsMax,
        tags: [],
        layers: DEFAULT_LAYERS,
      }),
    ).toBe("");
  });

  it("writes from, to, tag, hide, and show", () => {
    expect(
      buildMapFilterQuery({
        from: { year: 2019, month: 8 },
        to: { year: 2020, month: 1 },
        boundsMin,
        boundsMax,
        tags: ["Long distance"],
        layers: { ...DEFAULT_LAYERS, flight: false, bookmarks: true },
      }),
    ).toBe("from=2019-08&to=2020-01&tag=Long+distance&hide=flight&show=bookmarks");
  });

  it("writes multiple tags", () => {
    expect(
      buildMapFilterQuery({
        from: boundsMin,
        to: boundsMax,
        boundsMin,
        boundsMax,
        tags: ["Work", "Family"],
        layers: DEFAULT_LAYERS,
      }),
    ).toBe("tag=Work&tag=Family");
  });
});

describe("clampFilterRange", () => {
  it("swaps inverted ranges and clamps to bounds", () => {
    expect(
      clampFilterRange(
        { year: 2022, month: 1 },
        { year: 2019, month: 6 },
        { year: 2018, month: 1 },
        { year: 2025, month: 12 },
      ),
    ).toEqual({
      start: { year: 2019, month: 6 },
      end: { year: 2022, month: 1 },
    });
  });
});
