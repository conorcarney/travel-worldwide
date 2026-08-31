import type { CollectionKey } from "@/lib/collections";
import { COUNTRY_RATING_SEED } from "@/lib/map/country-ratings";
import { PASSAT_BORDER_CROSSING_SEED } from "@/lib/map/passat-border-crossings";

/** Sample documents matching Atlas `Countries` shapes (used without Mongo). */
export const fixtures: Record<CollectionKey, unknown[]> = {
  countries: [],
  countryList: [
    {
      type: "FeatureCollection",
      features: [],
    },
  ],
  visited: [{ name: "Ireland" }, { name: "Spain" }],
  flights: [
    {
      departure: "Dublin",
      arrival: "Barcelona",
      connecting: "",
      date: "10/08/2019",
      departure_coordinates: "-6.2499, 53.4264",
      connecting_coordinates: "",
      arrival_coordinates: "2.0785, 41.2971",
    },
  ],
  busesTrainsAndFerries: [
    {
      departure: "Barcelona",
      departure_longitude: 2.1686,
      departure_latitude: 41.3874,
      arrival: "Madrid",
      arrival_longitude: -3.7038,
      arrival_latitude: 40.4168,
      type: "Train",
      date: "15/08/2019",
    },
    {
      departure: "Holyhead",
      departure_longitude: -4.6328,
      departure_latitude: 53.3092,
      arrival: "Dublin",
      arrival_longitude: -6.2603,
      arrival_latitude: 53.3498,
      type: "Ferry",
      date: "02/06/2018",
    },
  ],
  mapsMeBookmarks: [
    {
      type: "FeatureCollection",
      name: "My Places",
      features: [
        {
          type: "Feature",
          properties: {
            Name: "Temple Bar",
            description: null,
            timestamp: "2018/06/03 12:00:00+00",
          },
          geometry: {
            type: "Point",
            coordinates: [-6.2672, 53.3456],
          },
        },
      ],
    },
  ],
  blogs: [
    {
      _id: "fixture-blog-1",
      name: "Ireland",
      date_of_first_visit: "06/2018",
      url: "ireland",
      blog_title: "First trip notes",
      blog_description:
        "Notes from the trip around Ireland, from Temple Bar to the west coast.",
      tags: "",
    },
  ],
  countryRatings: COUNTRY_RATING_SEED,
  passatBorderCrossings: PASSAT_BORDER_CROSSING_SEED,
  users: [],
  roles: [{ name: "admin" }],
};
