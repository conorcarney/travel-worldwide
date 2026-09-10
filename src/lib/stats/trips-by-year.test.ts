import { describe, expect, it } from "vitest";
import { summarizeTripsByYear } from "@/lib/stats/trips-by-year";

describe("summarizeTripsByYear", () => {
  it("counts dated trips for one mode and skips empty years", () => {
    expect(
      summarizeTripsByYear(
        [
          { mode: "flight", date: "01/06/2018" },
          { mode: "flight", date: "12/2018" },
          { mode: "bus", date: "01/06/2019" },
          { mode: "flight", date: "02/2020" },
          { mode: "flight", date: "" },
        ],
        "flight",
      ),
    ).toEqual([
      { year: 2018, count: 2 },
      { year: 2020, count: 1 },
    ]);
  });
});
