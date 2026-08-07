import { describe, expect, it } from "vitest";
import {
  filterByYearRange,
  getYearBounds,
  inYearRange,
  parseYear,
} from "@/lib/map/years";

describe("parseYear", () => {
  it("parses DD/MM/YYYY and M/YYYY route dates", () => {
    expect(parseYear("19/01/2023")).toBe(2023);
    expect(parseYear("2/2020")).toBe(2020);
    expect(parseYear("11/2018")).toBe(2018);
  });

  it("parses MAPS.ME timestamps", () => {
    expect(parseYear("2022/08/26 14:54:36+00")).toBe(2022);
  });

  it("parses ISO dates", () => {
    expect(parseYear("2019-08-12")).toBe(2019);
  });

  it("returns null for empty or unknown formats", () => {
    expect(parseYear("")).toBeNull();
    expect(parseYear("sometime")).toBeNull();
  });
});

describe("inYearRange", () => {
  it("includes dates inside the range", () => {
    expect(inYearRange("15/08/2019", 2018, 2020)).toBe(true);
    expect(inYearRange("15/08/2019", 2020, 2018)).toBe(true);
  });

  it("excludes dates outside the range", () => {
    expect(inYearRange("15/08/2019", 2020, 2022)).toBe(false);
  });

  it("keeps undated items visible", () => {
    expect(inYearRange("", 2010, 2012)).toBe(true);
  });
});

describe("getYearBounds", () => {
  it("returns min from data and extends max through 2027", () => {
    expect(
      getYearBounds(["2/2020", "19/01/2023", "bad"], new Date("2026-08-03")),
    ).toEqual({
      min: 2020,
      max: 2027,
    });
  });

  it("keeps a later data year if it is after 2027", () => {
    expect(
      getYearBounds(["01/01/2030"], new Date("2026-01-01")),
    ).toEqual({
      min: 2030,
      max: 2030,
    });
  });

  it("uses fallback min and 2027 when no years exist", () => {
    expect(getYearBounds([], new Date("2026-08-03"), 2001)).toEqual({
      min: 2001,
      max: 2027,
    });
  });
});

describe("filterByYearRange", () => {
  it("filters items by parsed year", () => {
    const items = [
      { id: "a", date: "01/01/2018" },
      { id: "b", date: "01/01/2020" },
      { id: "c", date: "01/01/2022" },
    ];
    expect(filterByYearRange(items, 2019, 2021).map((item) => item.id)).toEqual(
      ["b"],
    );
  });
});
