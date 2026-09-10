import { describe, expect, it } from "vitest";
import { formatMapFilterStatus } from "@/lib/map/filter-summary";

describe("formatMapFilterStatus", () => {
  it("returns the date range and a blank tag line when nothing else is set", () => {
    expect(
      formatMapFilterStatus({
        rangeLabel: "Oct 2015 – Dec 2027",
        tags: [],
      }),
    ).toEqual({
      dates: "Oct 2015 – Dec 2027",
      tags: "",
    });
  });

  it("lists selected tags", () => {
    expect(
      formatMapFilterStatus({
        rangeLabel: "Jan 2015 – Dec 2016",
        tags: ["Work", "Family"],
      }).tags,
    ).toBe("Work · Family");
  });
});
