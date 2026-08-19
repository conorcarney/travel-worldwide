import { z } from "zod";

function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || undefined;
}

/** Split a comma-separated date list, trim parts, and join consistently. */
export function normalizeOtherVisitDates(
  value: string | undefined,
): string | undefined {
  if (value == null) return undefined;
  const dates = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return dates.length > 0 ? dates.join(", ") : undefined;
}

export const visitedWriteSchema = z.object({
  name: z.string().trim().min(1, "Country name is required"),
  date: z
    .string()
    .optional()
    .transform((value) => optionalTrimmed(value)),
  other_visit_dates: z
    .string()
    .optional()
    .transform((value) => normalizeOtherVisitDates(value)),
});

export type VisitedWriteInput = z.infer<typeof visitedWriteSchema>;

export type VisitedRecord = {
  _id: string;
  name: string;
  date?: string;
  other_visit_dates?: string;
};
