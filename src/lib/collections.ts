/** MongoDB collection names from the existing backend. */
export const COLLECTIONS = {
  countries: "Countries",
  countryList: "CountryList",
  visited: "Visited",
  flights: "Flights",
  busesTrainsAndFerries: "BusesTrainsAndFerries",
  mapsMeBookmarks: "MapsMeBookmarks",
  blogs: "Blogs",
  countryRatings: "CountryRatings",
  passatBorderCrossings: "PassatBorderCrossings",
  users: "users",
  roles: "roles",
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;
