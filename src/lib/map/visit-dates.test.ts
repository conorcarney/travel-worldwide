import { describe, expect, it } from "vitest";
import { allVisitDates, isVisitedInFilter } from "@/lib/map/visit-dates";

const spain = {
  name: "Spain",
  date: "06/2018",
  other_visit_dates: "08/2020, 03/2022",
};

describe("allVisitDates", () => {
  it("includes the first visit and comma-separated return visits", () => {
    expect(allVisitDates(spain)).toEqual(["06/2018", "08/2020", "03/2022"]);
  });

  it("returns an empty list when there are no dates", () => {
    expect(allVisitDates({})).toEqual([]);
  });
});

describe("isVisitedInFilter", () => {
  const range2020 = {
    start: { year: 2020, month: 1 },
    end: { year: 2020, month: 12 },
  };

  it("highlights a country when a return visit falls in the filter", () => {
    expect(
      isVisitedInFilter(spain, range2020.start, range2020.end, null, true),
    ).toBe(true);
  });

  it("does not highlight when no visit falls in the filter", () => {
    expect(
      isVisitedInFilter(
        spain,
        { year: 2019, month: 1 },
        { year: 2019, month: 12 },
        null,
        true,
      ),
    ).toBe(false);
  });

  it("waits until playback reaches the return visit", () => {
    expect(
      isVisitedInFilter(
        spain,
        range2020.start,
        range2020.end,
        { year: 2020, month: 7 },
        false,
      ),
    ).toBe(false);
    expect(
      isVisitedInFilter(
        spain,
        range2020.start,
        range2020.end,
        { year: 2020, month: 8 },
        false,
      ),
    ).toBe(true);
  });

  it("still highlights on the first-visit date inside the filter", () => {
    expect(
      isVisitedInFilter(
        spain,
        { year: 2018, month: 1 },
        { year: 2018, month: 12 },
        null,
        true,
      ),
    ).toBe(true);
  });

  it("shows undated countries only when playback is complete", () => {
    expect(
      isVisitedInFilter(
        {},
        range2020.start,
        range2020.end,
        { year: 2020, month: 6 },
        false,
      ),
    ).toBe(false);
    expect(
      isVisitedInFilter(
        {},
        range2020.start,
        range2020.end,
        null,
        true,
      ),
    ).toBe(true);
  });
});
