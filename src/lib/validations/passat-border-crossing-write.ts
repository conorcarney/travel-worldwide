import { z } from "zod";
import { parseTripDate } from "@/lib/trip-date";
import {
  isCrossingTime,
  isEntryClock,
} from "@/lib/map/passat-border-crossings";

const optionalText = z.preprocess((value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}, z.string());

export const passatBorderCrossingWriteSchema = z.object({
  departureCountry: z.string().trim().min(1, "Departure country is required"),
  entryCountry: z.string().trim().min(1, "Entry country is required"),
  borderName: optionalText,
  date: optionalText.refine(
    (value) => value === "" || parseTripDate(value) !== null,
    "Use a date like 01/06/2025",
  ),
  entryTime: optionalText.refine(
    (value) => value === "" || isEntryClock(value),
    "Use 24-hour time (e.g. 14:30)",
  ),
  totalCrossingTime: z
    .string()
    .trim()
    .min(1, "Crossing time is required")
    .refine(isCrossingTime, "Use hours:minutes (e.g. 1:39)"),
});

export type PassatBorderCrossingWriteInput = z.infer<
  typeof passatBorderCrossingWriteSchema
>;

export type PassatBorderCrossingRecord = PassatBorderCrossingWriteInput & {
  _id: string;
  sortIndex: number;
};
