import { z } from "zod";

export const visitedWriteSchema = z.object({
  name: z.string().trim().min(1, "Country name is required"),
  date: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
});

export type VisitedWriteInput = z.infer<typeof visitedWriteSchema>;

export type VisitedRecord = {
  _id: string;
  name: string;
  date?: string;
};
