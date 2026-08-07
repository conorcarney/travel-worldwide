import { z } from "zod";

/** "lng, lat" as stored on Flights documents. */
export const coordinatePairSchema = z
  .string()
  .trim()
  .regex(
    /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/,
    "Use coordinates as lng, lat (e.g. -6.2603, 53.3498)",
  );

export const flightWriteSchema = z.object({
  departure: z.string().trim().min(1, "Departure is required"),
  arrival: z.string().trim().min(1, "Arrival is required"),
  connecting: z.string().trim().optional().default(""),
  date: z.string().trim().min(1, "Date is required"),
  departure_coordinates: coordinatePairSchema,
  connecting_coordinates: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || coordinatePairSchema.safeParse(value).success,
      "Connecting coordinates must be empty or lng, lat",
    )
    .default(""),
  arrival_coordinates: coordinatePairSchema,
});

export type FlightWriteInput = z.infer<typeof flightWriteSchema>;

export type FlightRecord = FlightWriteInput & { _id: string };
