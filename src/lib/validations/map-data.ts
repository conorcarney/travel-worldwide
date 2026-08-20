import { z } from "zod";

/** "lng, lat" strings as stored on Flights documents. */
export const lngLatStringSchema = z.string();

const coordinateSchema = z.coerce.number().finite();

export const mongoFlightSchema = z.object({
  _id: z.union([z.string(), z.number()]).optional(),
  departure: z.string(),
  arrival: z.string(),
  connecting: z.string().optional().nullable(),
  date: z.string(),
  departure_coordinates: lngLatStringSchema,
  connecting_coordinates: z.string().optional().nullable(),
  arrival_coordinates: lngLatStringSchema,
  tags: z.string().optional(),
});

export const mongoSurfaceRouteSchema = z.object({
  _id: z.union([z.string(), z.number()]).optional(),
  departure: z.string(),
  arrival: z.string(),
  departure_longitude: coordinateSchema,
  departure_latitude: coordinateSchema,
  arrival_longitude: coordinateSchema,
  arrival_latitude: coordinateSchema,
  type: z.enum(["Bus", "Train", "Ferry", "Car"]),
  date: z.string(),
  tags: z.string().optional(),
});

export const mongoVisitedSchema = z.object({
  _id: z.union([z.string(), z.number()]).optional(),
  name: z.string(),
  date: z.string().optional(),
  other_visit_dates: z.string().optional(),
});

export const mongoBlogSchema = z.object({
  _id: z.union([z.string(), z.number()]).optional(),
  name: z.string(),
  date_of_first_visit: z.string().optional(),
  url: z.string().optional(),
  blog_title: z.string().optional(),
  blog_description: z.string().optional(),
  tags: z.string().optional(),
});

export const mongoBookmarkFeatureSchema = z.object({
  type: z.literal("Feature").optional(),
  properties: z
    .object({
      Name: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      timestamp: z.string().optional().nullable(),
    })
    .passthrough(),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
});

export const mongoBookmarkCollectionSchema = z.object({
  _id: z.union([z.string(), z.number()]).optional(),
  type: z.literal("FeatureCollection").optional(),
  name: z.string().optional(),
  features: z.array(mongoBookmarkFeatureSchema),
});

export const travelModeSchema = z.enum([
  "flight",
  "bus",
  "train",
  "ferry",
  "car",
]);

/** Normalized map route (Leaflet [lat, lng] path). */
export const mapRouteSchema = z.object({
  id: z.string(),
  mode: travelModeSchema,
  from: z.string(),
  to: z.string(),
  date: z.string(),
  path: z.array(z.tuple([z.number(), z.number()])).min(2),
  distanceKm: z.number().nonnegative(),
  tags: z.string().optional(),
});

/** Normalized bookmark point. */
export const mapBookmarkSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  lat: z.number(),
  lng: z.number(),
});

export type MongoFlight = z.infer<typeof mongoFlightSchema>;
export type MongoSurfaceRoute = z.infer<typeof mongoSurfaceRouteSchema>;
export type MongoVisited = z.infer<typeof mongoVisitedSchema>;
export type MongoBlog = z.infer<typeof mongoBlogSchema>;
export type MapRoute = z.infer<typeof mapRouteSchema>;
export type MapBookmark = z.infer<typeof mapBookmarkSchema>;
export type TravelMode = z.infer<typeof travelModeSchema>;
