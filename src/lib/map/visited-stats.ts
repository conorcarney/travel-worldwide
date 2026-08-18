import { parseYear } from "@/lib/map/years";

export type CountriesByYearRow = {
  year: number;
  newCountries: number;
};

/**
 * Count first-time country visits per calendar year.
 * If a country appears more than once, only the earliest dated visit counts.
 * Undated visits are omitted.
 */
export function summarizeNewCountriesByYear(
  visited: Array<{ name: string; date?: string }>,
  yearStart?: number,
  yearEnd?: number,
): CountriesByYearRow[] {
  const firstVisitYear = new Map<string, number>();

  for (const item of visited) {
    const name = item.name.trim();
    if (!name) continue;
    const year = parseYear(item.date ?? "");
    if (year === null) continue;
    if (yearStart !== undefined && year < yearStart) continue;
    if (yearEnd !== undefined && year > yearEnd) continue;

    const key = name.toLowerCase();
    const existing = firstVisitYear.get(key);
    if (existing === undefined || year < existing) {
      firstVisitYear.set(key, year);
    }
  }

  const counts = new Map<number, number>();
  for (const year of firstVisitYear.values()) {
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, newCountries]) => ({ year, newCountries }));
}
