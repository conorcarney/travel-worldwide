import { z } from "zod";

export const SURFACE_ROUTE_TYPES = ["Bus", "Train", "Ferry", "Car"] as const;

export const surfaceRouteTypeSchema = z.enum(SURFACE_ROUTE_TYPES);

const coordinateNumberSchema = z.coerce.number().finite({
  message: "Coordinate must be a number",
});

export const surfaceRouteWriteSchema = z.object({
  departure: z.string().trim().min(1, "Departure is required"),
  arrival: z.string().trim().min(1, "Arrival is required"),
  departure_longitude: coordinateNumberSchema,
  departure_latitude: coordinateNumberSchema,
  arrival_longitude: coordinateNumberSchema,
  arrival_latitude: coordinateNumberSchema,
  type: surfaceRouteTypeSchema,
  date: z.string().trim().min(1, "Date is required"),
  tags: z.string().trim().optional().default(""),
  media: z.string().trim().optional().default(""),
});

export type SurfaceRouteWriteInput = z.infer<typeof surfaceRouteWriteSchema>;

export type SurfaceRouteRecord = SurfaceRouteWriteInput & { _id: string };
