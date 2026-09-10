import { describe, expect, it } from "vitest";
import { DEFAULT_LAYERS } from "@/lib/map/filter-url";
import { formatMapFilterStatus } from "@/lib/map/filter-summary";

describe("formatMapFilterStatus", () => {
  it("returns the date range and a blank filter line when nothing else is set", () => {
    expect(
      formatMapFilterStatus({
        rangeLabel: "Oct 2015 – Dec 2027",
        tags: [],
        layers: DEFAULT_LAYERS,
      }),
    ).toEqual({
      dates: "Oct 2015 – Dec 2027",
      filters: "",
    });
  });

  it("lists selected tags", () => {
    expect(
      formatMapFilterStatus({
        rangeLabel: "Jan 2015 – Dec 2016",
        tags: ["Work", "Family"],
        layers: DEFAULT_LAYERS,
      }).filters,
    ).toBe("Work · Family");
  });

  it("names layers that differ from the defaults", () => {
    expect(
      formatMapFilterStatus({
        rangeLabel: "Jan 2019",
        tags: ["Long distance"],
        layers: { ...DEFAULT_LAYERS, flight: false, bookmarks: true },
      }).filters,
    ).toBe("Long distance · Flights off · Bookmarks");
  });
});
