import { z } from "zod";

export const countryListWriteSchema = z.object({
  name: z.string().trim().min(1, "Country name is required"),
});

export type CountryListWriteInput = z.infer<typeof countryListWriteSchema>;
