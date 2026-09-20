export type CountryReturnVisit = "Y" | "N" | "M";

export type CountryRatingRow = {
  name: string;
  continent: string;
  culture: number;
  entertainment: number;
  landscapes: number;
  price: number;
  easeOfEntry: number;
  food: number;
  experiences: number;
  drivers: number | null;
  roads: number | null;
  rating: number | null;
  returnVisit: CountryReturnVisit | null;
  reason: string;
};

export const COUNTRY_RATING_SCORE_FIELDS = [
  ["culture", "Culture"],
  ["entertainment", "Entertainment"],
  ["landscapes", "Landscapes"],
  ["price", "Price"],
  ["easeOfEntry", "Ease of entry"],
  ["food", "Food"],
  ["experiences", "Experiences"],
  ["drivers", "Drivers"],
  ["roads", "Roads"],
] as const;

export type CountryRatingScoreKey =
  (typeof COUNTRY_RATING_SCORE_FIELDS)[number][0];

export type CountryRatingScores = Pick<CountryRatingRow, CountryRatingScoreKey>;

/**
 * Overall rating = mean of category scores.
 * Drivers/roads are included only when set.
 */
export function computeCountryRatingAverage(
  scores: CountryRatingScores,
): number | null {
  const values = COUNTRY_RATING_SCORE_FIELDS.map(([key]) => scores[key]).filter(
    (value): value is number => value != null && Number.isFinite(value),
  );

  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatRatingScore(value: number | null, digits = 2): string {
  if (value == null) return "—";
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : Math.min(digits, 2),
    maximumFractionDigits: digits,
  });
}

export function formatReturnVisit(value: CountryReturnVisit | null): string {
  if (value === "Y") return "Yes";
  if (value === "N") return "No";
  if (value === "M") return "Maybe";
  return "—";
}

/** Normalize Mongo/fixture docs into rating rows for the stats UI. */
export function normalizeCountryRatings(data: unknown[]): CountryRatingRow[] {
  const rows: CountryRatingRow[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const record = item as Partial<CountryRatingRow>;
    if (typeof record.name !== "string" || !record.name.trim()) continue;
    if (typeof record.continent !== "string" || !record.continent.trim()) {
      continue;
    }
    rows.push({
      name: record.name.trim(),
      continent: record.continent.trim(),
      culture: Number(record.culture) || 0,
      entertainment: Number(record.entertainment) || 0,
      landscapes: Number(record.landscapes) || 0,
      price: Number(record.price) || 0,
      easeOfEntry: Number(record.easeOfEntry) || 0,
      food: Number(record.food) || 0,
      experiences: Number(record.experiences) || 0,
      drivers: record.drivers == null ? null : Number(record.drivers),
      roads: record.roads == null ? null : Number(record.roads),
      rating: null,
      returnVisit:
        record.returnVisit === "Y" ||
        record.returnVisit === "N" ||
        record.returnVisit === "M"
          ? record.returnVisit
          : null,
      reason: typeof record.reason === "string" ? record.reason : "",
    });
  }

  return rows
    .map((row) => ({
      ...row,
      rating: computeCountryRatingAverage(row),
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" }),
    );
}
