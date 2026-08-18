import { describe, expect, it } from "vitest";
import { summarizeNewCountriesByYear } from "@/lib/map/visited-stats";

describe("summarizeNewCountriesByYear", () => {
  it("counts each country once in its earliest visit year", () => {
    expect(
      summarizeNewCountriesByYear([
        { name: "Spain", date: "01/06/2018" },
        { name: "Ireland", date: "15/08/2019" },
        { name: "Spain", date: "01/01/2020" },
        { name: "Belize", date: "2/2020" },
        { name: "France" },
      ]),
    ).toEqual([
      { year: 2018, newCountries: 1 },
      { year: 2019, newCountries: 1 },
      { year: 2020, newCountries: 1 },
    ]);
  });

  it("respects an optional year window", () => {
    expect(
      summarizeNewCountriesByYear(
        [
          { name: "Spain", date: "01/06/2018" },
          { name: "Ireland", date: "15/08/2019" },
          { name: "Belize", date: "2/2020" },
        ],
        2019,
        2019,
      ),
    ).toEqual([{ year: 2019, newCountries: 1 }]);
  });
});
