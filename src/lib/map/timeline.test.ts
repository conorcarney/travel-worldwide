import { describe, expect, it } from "vitest";
import {
  buildPlaybackSteps,
  collectEventMonths,
  compareByDateThenId,
  dateOrderKey,
  filterByPlaybackMonth,
  formatYearMonth,
  formatYearMonthRange,
  formatTripDate,
  isInYearMonth,
  isOnOrBefore,
  parseYearMonth,
  yearMonthKey,
} from "@/lib/map/timeline";

describe("parseYearMonth", () => {
  it("parses DD/MM/YYYY and M/YYYY", () => {
    expect(parseYearMonth("19/01/2023")).toEqual({ year: 2023, month: 1 });
    expect(parseYearMonth("19/01/2023 14:30")).toEqual({
      year: 2023,
      month: 1,
    });
    expect(parseYearMonth("2/2020")).toEqual({ year: 2020, month: 2 });
  });

  it("parses MAPS.ME and ISO timestamps", () => {
    expect(parseYearMonth("2022/08/26 14:54:36+00")).toEqual({
      year: 2022,
      month: 8,
    });
    expect(parseYearMonth("2019-08-12")).toEqual({ year: 2019, month: 8 });
  });

  it("returns null for empty or unknown formats", () => {
    expect(parseYearMonth("")).toBeNull();
    expect(parseYearMonth("sometime")).toBeNull();
  });
});

describe("collectEventMonths", () => {
  it("returns sorted unique months and skips empties", () => {
    expect(
      collectEventMonths([
        "01/03/2020",
        "15/01/2020",
        "bad",
        "2020/01/20 12:00:00+00",
        "2/2021",
      ]),
    ).toEqual([
      { year: 2020, month: 1 },
      { year: 2020, month: 3 },
      { year: 2021, month: 2 },
    ]);
  });
});

describe("isOnOrBefore / filterByPlaybackMonth", () => {
  it("compares month keys", () => {
    expect(yearMonthKey({ year: 2019, month: 8 })).toBe(201908);
    expect(formatYearMonth({ year: 2019, month: 8 })).toBe("Aug 2019");
    expect(formatYearMonthRange({ year: 2019, month: 8 }, { year: 2019, month: 8 })).toBe(
      "Aug 2019",
    );
    expect(formatYearMonthRange({ year: 1992, month: 1 }, { year: 2027, month: 12 })).toBe(
      "Jan 1992 – Dec 2027",
    );
    expect(formatTripDate("15/08/2019")).toBe("15 Aug 2019");
    expect(formatTripDate("15/08/2019 14:30")).toBe("15 Aug 2019, 14:30");
    expect(formatTripDate("2019-08-12")).toBe("12 Aug 2019");
    expect(formatTripDate("2/2020")).toBe("Feb 2020");
    expect(formatTripDate("")).toBe("");
    expect(isOnOrBefore("15/08/2019", { year: 2019, month: 8 })).toBe(true);
    expect(isOnOrBefore("01/09/2019", { year: 2019, month: 8 })).toBe(false);
    expect(isOnOrBefore("15/08/2019", null)).toBe(false);
  });

  it("keeps cumulative dated items and optionally undated after complete", () => {
    const items = [
      { id: "a", date: "01/01/2020" },
      { id: "b", date: "01/03/2020" },
      { id: "c", date: "" },
    ];

    expect(
      filterByPlaybackMonth(items, null).map((item) => item.id),
    ).toEqual([]);

    expect(
      filterByPlaybackMonth(items, { year: 2020, month: 1 }).map(
        (item) => item.id,
      ),
    ).toEqual(["a"]);

    expect(
      filterByPlaybackMonth(items, { year: 2020, month: 3 }).map(
        (item) => item.id,
      ),
    ).toEqual(["a", "b"]);

    expect(
      filterByPlaybackMonth(items, { year: 2020, month: 3 }, {
        includeUndatedWhenComplete: true,
        playbackComplete: true,
      }).map((item) => item.id),
    ).toEqual(["a", "b", "c"]);
  });
});

describe("dateOrderKey / playback steps", () => {
  it("orders mixed date formats by calendar day and time", () => {
    expect(dateOrderKey("15/08/2019")).toBe(20190815000000);
    expect(dateOrderKey("2019-08-12")).toBe(20190812000000);
    expect(dateOrderKey("2/2020")).toBe(20200201000000);
    expect(dateOrderKey("15/08/2019 14:30")).toBe(20190815143000);
    expect(dateOrderKey("")).toBe(Number.POSITIVE_INFINITY);
  });

  it("compares by date then id", () => {
    const items = [
      { id: "b", date: "15/01/2020" },
      { id: "a", date: "15/01/2020" },
      { id: "c", date: "01/01/2020" },
    ];
    expect([...items].sort(compareByDateThenId).map((item) => item.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("orders same-day routes by time", () => {
    const items = [
      { id: "later", date: "15/01/2020 18:00" },
      { id: "earlier", date: "15/01/2020 09:15" },
    ];
    expect([...items].sort(compareByDateThenId).map((item) => item.id)).toEqual([
      "earlier",
      "later",
    ]);
  });

  it("builds month ticks with dated routes in order and skips undated", () => {
    expect(isInYearMonth("15/01/2020", { year: 2020, month: 1 })).toBe(true);
    expect(isInYearMonth("01/03/2020", { year: 2020, month: 1 })).toBe(false);

    expect(
      buildPlaybackSteps(
        [
          { year: 2020, month: 1 },
          { year: 2020, month: 3 },
        ],
        [
          { id: "later", date: "10/03/2020" },
          { id: "undated", date: "" },
          { id: "first", date: "02/01/2020" },
          { id: "second", date: "20/01/2020" },
        ],
      ),
    ).toEqual([
      { kind: "month", month: { year: 2020, month: 1 } },
      { kind: "route", routeId: "first" },
      { kind: "route", routeId: "second" },
      { kind: "month", month: { year: 2020, month: 3 } },
      { kind: "route", routeId: "later" },
    ]);
  });
});
