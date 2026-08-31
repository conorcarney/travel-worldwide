import { describe, expect, it } from "vitest";
import {
  clampYearMonth,
  filterByMonthRange,
  filterByYearRange,
  getMonthBounds,
  getYearBounds,
  inMonthRange,
  inYearRange,
  monthFromIndex,
  monthIndex,
  parseFilterMonthInput,
  parseYear,
} from "@/lib/map/years";

describe("parseYear", () => {
  it("parses DD/MM/YYYY and M/YYYY route dates", () => {
    expect(parseYear("19/01/2023")).toBe(2023);
    expect(parseYear("19/01/2023 14:30")).toBe(2023);
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

describe("monthIndex", () => {
  it("round-trips year-month values", () => {
    expect(monthFromIndex(monthIndex({ year: 2019, month: 8 }))).toEqual({
      year: 2019,
      month: 8,
    });
  });
});

describe("inMonthRange / filterByMonthRange", () => {
  it("includes dates inside the month window", () => {
    expect(
      inMonthRange("15/08/2019", { year: 2019, month: 3 }, { year: 2019, month: 8 }),
    ).toBe(true);
    expect(
      inMonthRange("15/08/2019", { year: 2019, month: 9 }, { year: 2020, month: 1 }),
    ).toBe(false);
  });

  it("keeps undated items visible", () => {
    expect(
      inMonthRange("", { year: 2010, month: 1 }, { year: 2012, month: 12 }),
    ).toBe(true);
  });

  it("filters items by month window", () => {
    const items = [
      { id: "a", date: "01/01/2019" },
      { id: "b", date: "15/08/2019" },
      { id: "c", date: "01/01/2020" },
    ];
    expect(
      filterByMonthRange(
        items,
        { year: 2019, month: 8 },
        { year: 2019, month: 12 },
      ).map((item) => item.id),
    ).toEqual(["b"]);
  });
});

describe("getMonthBounds", () => {
  it("uses the earliest data month and extends max through Dec 2027", () => {
    expect(
      getMonthBounds(["2/2020", "19/01/2023", "bad"], new Date("2026-08-03")),
    ).toEqual({
      min: { year: 2020, month: 2 },
      max: { year: 2027, month: 12 },
    });
  });
});

describe("parseFilterMonthInput", () => {
  it("treats a bare year as January for start and December for end", () => {
    expect(parseFilterMonthInput("2015", "start")).toEqual({
      year: 2015,
      month: 1,
    });
    expect(parseFilterMonthInput("2015", "end")).toEqual({
      year: 2015,
      month: 12,
    });
  });

  it("parses month names and slash dates", () => {
    expect(parseFilterMonthInput("Aug 2019", "start")).toEqual({
      year: 2019,
      month: 8,
    });
    expect(parseFilterMonthInput("August 2019", "end")).toEqual({
      year: 2019,
      month: 8,
    });
    expect(parseFilterMonthInput("8/2019", "start")).toEqual({
      year: 2019,
      month: 8,
    });
  });

  it("returns null for empty or unknown values", () => {
    expect(parseFilterMonthInput("  ", "start")).toBeNull();
    expect(parseFilterMonthInput("sometime", "end")).toBeNull();
  });
});

describe("clampYearMonth", () => {
  it("clamps to the inclusive bounds", () => {
    const min = { year: 2018, month: 3 };
    const max = { year: 2020, month: 6 };
    expect(clampYearMonth({ year: 2017, month: 12 }, min, max)).toEqual(min);
    expect(clampYearMonth({ year: 2021, month: 1 }, min, max)).toEqual(max);
    expect(clampYearMonth({ year: 2019, month: 8 }, min, max)).toEqual({
      year: 2019,
      month: 8,
    });
  });
});
