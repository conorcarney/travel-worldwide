import { describe, expect, it } from "vitest";
import {
  ALL_COUNTRY_COUNT,
  buildExtendedTravelStatistics,
  countUniqueCountriesVisited,
  longestTimeAwayFromHome,
  rankAirportVisits,
  rankCountryVisits,
  UN_MEMBER_STATE_COUNT,
} from "@/lib/map/travel-stats-page";
import type { MapRoute } from "@/lib/validations/map-data";

const sampleRoute = (
  mode: MapRoute["mode"],
  distanceKm: number,
): MapRoute => ({
  id: `${mode}-1`,
  mode,
  from: "A",
  to: "B",
  date: "01/2020",
  path: [
    [0, 0],
    [1, 1],
  ],
  distanceKm,
});

describe("countUniqueCountriesVisited", () => {
  it("counts distinct country names", () => {
    expect(
      countUniqueCountriesVisited([
        { name: "Spain" },
        { name: "France" },
        { name: "spain" },
      ]),
    ).toBe(2);
  });
});

describe("rankCountryVisits", () => {
  it("includes return visits", () => {
    expect(
      rankCountryVisits([
        {
          name: "Spain",
          date: "06/2018",
          other_visit_dates: "08/2020, 03/2022",
        },
        { name: "France", date: "01/2019" },
      ]),
    ).toEqual([
      { label: "Spain", count: 3 },
      { label: "France", count: 1 },
    ]);
  });
});

describe("rankAirportVisits", () => {
  it("counts departures, arrivals, and connections", () => {
    expect(
      rankAirportVisits([
        {
          departure: "Dublin",
          arrival: "London",
          connecting: "Amsterdam",
          date: "01/2020",
          departure_coordinates: "0,0",
          arrival_coordinates: "1,1",
        },
        {
          departure: "London",
          arrival: "Paris",
          date: "02/2020",
          departure_coordinates: "0,0",
          arrival_coordinates: "1,1",
        },
      ]),
    ).toEqual([
      { label: "London", count: 2 },
      { label: "Amsterdam", count: 1 },
      { label: "Dublin", count: 1 },
      { label: "Paris", count: 1 },
    ]);
  });
});

describe("longestTimeAwayFromHome", () => {
  it("finds the longest Ireland leave/return gap", () => {
    expect(
      longestTimeAwayFromHome([
        {
          ...sampleRoute("flight", 100),
          from: "Dublin",
          to: "Barcelona",
          date: "02/06/2018",
        },
        {
          ...sampleRoute("ferry", 50),
          from: "Holyhead",
          to: "Dublin",
          date: "27/07/2020",
        },
      ]),
    ).toEqual({
      days: 786,
      leftOn: "02/06/2018",
      returnedOn: "27/07/2020",
    });
  });

  it("ignores domestic and abroad-only legs", () => {
    expect(
      longestTimeAwayFromHome([
        {
          ...sampleRoute("flight", 100),
          from: "Dublin",
          to: "London",
          date: "01/01/2020",
        },
        {
          ...sampleRoute("flight", 100),
          from: "London",
          to: "Paris",
          date: "15/01/2020",
        },
        {
          ...sampleRoute("flight", 100),
          from: "Paris",
          to: "Dublin",
          date: "01/02/2020",
        },
      ]),
    ).toEqual({
      days: 31,
      leftOn: "01/01/2020",
      returnedOn: "01/02/2020",
    });
  });
});

describe("buildExtendedTravelStatistics", () => {
  it("assembles page statistics", () => {
    const stats = buildExtendedTravelStatistics({
      routes: [
        sampleRoute("flight", 1000),
        sampleRoute("car", 50),
        sampleRoute("bus", 120),
        sampleRoute("train", 300),
      ],
      visited: [{ name: "Ireland" }, { name: "Spain", date: "01/2020" }],
      flightsRaw: [
        {
          departure: "Dublin",
          arrival: "Madrid",
          date: "01/2020",
          departure_coordinates: "0,0",
          arrival_coordinates: "1,1",
        },
      ],
    });

    expect(stats.countriesVisited).toBe(2);
    expect(stats.unMemberTotal).toBe(UN_MEMBER_STATE_COUNT);
    expect(stats.allCountriesTotal).toBe(ALL_COUNTRY_COUNT);
    expect(stats.travel.totalDistanceKm).toBe(1470);
    expect(stats.travel.totalCount).toBe(4);
    expect(stats.topAirports[0]).toEqual({ label: "Dublin", count: 1 });
    expect(stats.topCountries).toHaveLength(2);
  });
});
