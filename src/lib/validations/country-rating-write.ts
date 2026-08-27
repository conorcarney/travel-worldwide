import { z } from "zod";

const scoreSchema = z.coerce
  .number()
  .min(0, "Score must be at least 0")
  .max(10, "Score must be at most 10");

const optionalScoreSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  return value;
}, scoreSchema.nullable());

const returnVisitSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  return value;
}, z.enum(["Y", "N", "M"]).nullable());

export const countryRatingWriteSchema = z.object({
  name: z.string().trim().min(1, "Country name is required"),
  continent: z.string().trim().min(1, "Continent is required"),
  culture: scoreSchema,
  entertainment: scoreSchema,
  landscapes: scoreSchema,
  price: scoreSchema,
  easeOfEntry: scoreSchema,
  food: scoreSchema,
  experiences: scoreSchema,
  drivers: optionalScoreSchema,
  roads: optionalScoreSchema,
  returnVisit: returnVisitSchema,
  reason: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? ""),
});

export type CountryRatingWriteInput = z.infer<typeof countryRatingWriteSchema>;

export type CountryRatingRecord = CountryRatingWriteInput & {
  _id: string;
  rating: number | null;
};
