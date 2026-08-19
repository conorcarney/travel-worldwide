import {
  parseNamedMonthYear,
  parseYearMonth,
  yearMonthKey,
  type YearMonth,
} from "@/lib/map/timeline";

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

export function monthIndex(value: YearMonth): number {
  return value.year * 12 + (value.month - 1);
}

export function monthFromIndex(index: number): YearMonth {
  return {
    year: Math.floor(index / 12),
    month: (index % 12) + 1,
  };
}

export function clampYearMonth(
  value: YearMonth,
  min: YearMonth,
  max: YearMonth,
): YearMonth {
  const key = yearMonthKey(value);
  if (key < yearMonthKey(min)) return min;
  if (key > yearMonthKey(max)) return max;
  return value;
}

export function inMonthRange(
  date: string,
  start: YearMonth,
  end: YearMonth,
): boolean {
  const parsed = parseYearMonth(date);
  if (parsed === null) {
    return true;
  }
  const key = yearMonthKey(parsed);
  const lo = Math.min(yearMonthKey(start), yearMonthKey(end));
  const hi = Math.max(yearMonthKey(start), yearMonthKey(end));
  return key >= lo && key <= hi;
}

export function filterByMonthRange<T extends { date: string }>(
  items: T[],
  start: YearMonth,
  end: YearMonth,
): T[] {
  return items.filter((item) => inMonthRange(item.date, start, end));
}

export function getMonthBounds(
  dates: string[],
  now: Date = new Date(),
  fallbackMin = 2000,
): { min: YearMonth; max: YearMonth } {
  const filterMax: YearMonth = {
    year: Math.max(now.getFullYear(), 2027),
    month: 12,
  };
  const months = dates
    .map(parseYearMonth)
    .filter((value): value is YearMonth => value !== null);

  if (months.length === 0) {
    return { min: { year: fallbackMin, month: 1 }, max: filterMax };
  }

  const keys = months.map(yearMonthKey);
  const minKey = Math.min(...keys);
  const maxKey = Math.max(...keys, yearMonthKey(filterMax));
  return {
    min: { year: Math.floor(minKey / 100), month: minKey % 100 },
    max: { year: Math.floor(maxKey / 100), month: maxKey % 100 },
  };
}

/**
 * Parse a typed filter value. A bare year is January for `start` and
 * December for `end`. Also accepts Jan 2019, 08/2019, and full dates.
 */
export function parseFilterMonthInput(
  value: string,
  role: "start" | "end",
): YearMonth | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}$/.test(trimmed)) {
    const year = Number(trimmed);
    if (year < 1900 || year > 2100) return null;
    return { year, month: role === "end" ? 12 : 1 };
  }

  return parseNamedMonthYear(trimmed) ?? parseYearMonth(trimmed);
}
