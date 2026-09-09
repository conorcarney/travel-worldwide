import { parseTripDate, tripDateOrderKey } from "@/lib/trip-date";
import { parseYear } from "@/lib/map/years";

export type CountriesByYearRow = {
  year: number;
  newCountries: number;
};

export type FirstCountryVisit = {
  name: string;
  date: string;
  year: number;
};

/**
 * Earliest dated visit for each country. Undated visits are omitted.
 * Return trips in `other_visit_dates` are ignored — first visit is `date`.
 */
export function listFirstCountryVisits(
  visited: Array<{ name: string; date?: string }>,
): FirstCountryVisit[] {
  const first = new Map<string, FirstCountryVisit>();

  for (const item of visited) {
    const name = item.name.trim();
    if (!name) continue;
    const date = item.date?.trim() ?? "";
    const parsed = parseTripDate(date);
    if (!parsed) continue;

    const key = name.toLowerCase();
    const existing = first.get(key);
    if (
      existing === undefined ||
      tripDateOrderKey(date) < tripDateOrderKey(existing.date)
    ) {
      first.set(key, { name, date, year: parsed.year });
    }
  }

  return [...first.values()].sort(
    (left, right) => tripDateOrderKey(left.date) - tripDateOrderKey(right.date),
  );
}

export function firstCountryVisitsInYear(
  visits: FirstCountryVisit[],
  year: number,
): FirstCountryVisit[] {
  return visits.filter((visit) => visit.year === year);
}

/**
 * Position of a visit along a calendar year, 0 at 1 Jan and 1 at 31 Dec.
 * Month-only dates use the 1st of that month.
 */
export function yearProgress(date: string, year: number): number | null {
  const parsed = parseTripDate(date);
  if (!parsed || parsed.year !== year) return null;
  const day = parsed.day ?? 1;
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year, 11, 31);
  const at = Date.UTC(year, parsed.month - 1, day);
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (at - start) / (end - start)));
}

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
