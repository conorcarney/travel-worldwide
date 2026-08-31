import { describe, expect, it } from "vitest";
import {
  formatClock,
  parseTripDate,
  tripDateOrderKey,
  tripDateSortKey,
} from "@/lib/trip-date";

describe("parseTripDate", () => {
  it("parses DD/MM/YYYY with optional 24-hour time", () => {
    expect(parseTripDate("19/01/2023")).toEqual({
      year: 2023,
      month: 1,
      day: 19,
    });
    expect(parseTripDate("19/01/2023 14:30")).toEqual({
      year: 2023,
      month: 1,
      day: 19,
      hour: 14,
      minute: 30,
    });
    expect(parseTripDate("19/01/2023 8:05:09")).toEqual({
      year: 2023,
      month: 1,
      day: 19,
      hour: 8,
      minute: 5,
      second: 9,
    });
  });

  it("parses MAPS.ME timestamps including time", () => {
    expect(parseTripDate("2022/08/26 14:54:36+00")).toEqual({
      year: 2022,
      month: 8,
      day: 26,
      hour: 14,
      minute: 54,
      second: 36,
    });
  });
});

describe("formatClock", () => {
  it("omits seconds when they are zero or missing", () => {
    expect(
      formatClock({ year: 2023, month: 1, day: 19, hour: 14, minute: 30 }),
    ).toBe("14:30");
    expect(
      formatClock({
        year: 2023,
        month: 1,
        day: 19,
        hour: 14,
        minute: 30,
        second: 0,
      }),
    ).toBe("14:30");
  });
});

describe("sort keys", () => {
  it("pads time so a timed date does not sort after the next calendar day", () => {
    expect(tripDateSortKey("19/01/2023 14:30") < tripDateSortKey("20/01/2023")).toBe(
      true,
    );
    expect(tripDateOrderKey("19/01/2023 14:30")).toBeLessThan(
      tripDateOrderKey("20/01/2023"),
    );
  });
});
