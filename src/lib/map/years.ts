/** Extract a calendar year from the mixed date strings in Atlas data. */
export function parseYear(date: string): number | null {
  const trimmed = date.trim();
  if (!trimmed) return null;

  // MAPS.ME: "2022/08/26 14:54:36+00"
  const mapsMe = trimmed.match(/^(\d{4})\/\d{1,2}\/\d{1,2}/);
  if (mapsMe) {
    const year = Number(mapsMe[1]);
    return Number.isFinite(year) ? year : null;
  }

  // ISO-ish: "2019-08-12"
  const iso = trimmed.match(/^(\d{4})-\d{2}-\d{2}/);
  if (iso) {
    const year = Number(iso[1]);
    return Number.isFinite(year) ? year : null;
  }

  // "19/01/2023" or "2/2020" or "11/2018"
  const slashParts = trimmed.split(/[/\s]/).filter(Boolean);
  const last = slashParts[slashParts.length - 1];
  if (last && /^\d{4}$/.test(last)) {
    const year = Number(last);
    return year >= 1900 && year <= 2100 ? year : null;
  }

  return null;
}

export function inYearRange(
  date: string,
  yearStart: number,
  yearEnd: number,
): boolean {
  const year = parseYear(date);
  if (year === null) {
    // Undated records stay visible for any filter.
    return true;
  }
  const start = Math.min(yearStart, yearEnd);
  const end = Math.max(yearStart, yearEnd);
  return year >= start && year <= end;
}

export function getYearBounds(
  dates: string[],
  now: Date = new Date(),
  fallbackMin = 2000,
): { min: number; max: number } {
  const currentYear = now.getFullYear();
  // Keep the slider open through the planned travel horizon.
  const filterMaxYear = Math.max(currentYear, 2027);
  const years = dates
    .map(parseYear)
    .filter((year): year is number => year !== null);

  if (years.length === 0) {
    return { min: fallbackMin, max: filterMaxYear };
  }

  return {
    min: Math.min(...years),
    max: Math.max(...years, filterMaxYear),
  };
}

export function filterByYearRange<T extends { date: string }>(
  items: T[],
  yearStart: number,
  yearEnd: number,
): T[] {
  return items.filter((item) => inYearRange(item.date, yearStart, yearEnd));
}
