import { describe, expect, it } from "vitest";
import {
  firstCountryVisitsInYear,
  listFirstCountryVisits,
  summarizeNewCountriesByYear,
  yearProgress,
} from "@/lib/map/visited-stats";

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

describe("listFirstCountryVisits", () => {
  it("keeps the earliest dated visit per country", () => {
    expect(
      listFirstCountryVisits([
        { name: "Hungary", date: "09/01/2013" },
        { name: "Poland", date: "14/03/2013" },
        { name: "Netherlands", date: "25/08/2013" },
        { name: "Germany", date: "01/10/2013" },
        { name: "Hungary", date: "01/06/2018" },
        { name: "France" },
      ]),
    ).toEqual([
      { name: "Hungary", date: "09/01/2013", year: 2013 },
      { name: "Poland", date: "14/03/2013", year: 2013 },
      { name: "Netherlands", date: "25/08/2013", year: 2013 },
      { name: "Germany", date: "01/10/2013", year: 2013 },
    ]);
  });
});

describe("firstCountryVisitsInYear", () => {
  it("returns 2013 first visits in date order", () => {
    const visits = listFirstCountryVisits([
      { name: "Hungary", date: "09/01/2013" },
      { name: "Spain", date: "01/06/2018" },
      { name: "Germany", date: "01/10/2013" },
    ]);
    expect(firstCountryVisitsInYear(visits, 2013).map((row) => row.name)).toEqual(
      ["Hungary", "Germany"],
    );
  });
});

describe("yearProgress", () => {
  it("places January before October in 2013", () => {
    const january = yearProgress("09/01/2013", 2013);
    const october = yearProgress("01/10/2013", 2013);
    expect(january).not.toBeNull();
    expect(october).not.toBeNull();
    expect(january!).toBeLessThan(october!);
  });
});
