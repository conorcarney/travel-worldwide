import { describe, expect, it } from "vitest";
import { computeCountryRatingAverage } from "@/lib/map/country-ratings";

describe("computeCountryRatingAverage", () => {
  it("averages all category scores including drivers and roads", () => {
    expect(
      computeCountryRatingAverage({
        culture: 3,
        entertainment: 7,
        landscapes: 2,
        price: 4,
        easeOfEntry: 10,
        food: 5,
        experiences: 8,
        drivers: 5,
        roads: 5,
      }),
    ).toBeCloseTo(5.444444444, 8);
  });

  it("omits blank drivers and roads", () => {
    expect(
      computeCountryRatingAverage({
        culture: 6,
        entertainment: 4,
        landscapes: 5,
        price: 7,
        easeOfEntry: 10,
        food: 5,
        experiences: 3,
        drivers: null,
        roads: null,
      }),
    ).toBeCloseTo(5.714285714, 8);
  });
});
