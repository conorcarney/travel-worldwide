import { describe, expect, it } from "vitest";
import { COLLECTIONS } from "@/lib/collections";

describe("COLLECTIONS", () => {
  it("maps keys to the Atlas collection names", () => {
    expect(COLLECTIONS).toEqual({
      countries: "Countries",
      countryList: "CountryList",
      visited: "Visited",
      flights: "Flights",
      busesTrainsAndFerries: "BusesTrainsAndFerries",
      mapsMeBookmarks: "MapsMeBookmarks",
      blogs: "Blogs",
      users: "users",
      roles: "roles",
    });
  });
});
