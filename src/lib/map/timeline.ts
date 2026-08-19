export type YearMonth = {
  year: number;
  month: number; // 1–12
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Compact comparable key: 201908 for August 2019. */
export function yearMonthKey(value: YearMonth): number {
  return value.year * 100 + value.month;
}

export function formatYearMonth(value: YearMonth): string {
  return `${MONTH_LABELS[value.month - 1]} ${value.year}`;
}

export function formatYearMonthRange(start: YearMonth, end: YearMonth): string {
  if (yearMonthKey(start) === yearMonthKey(end)) {
    return formatYearMonth(start);
  }
  return `${formatYearMonth(start)} – ${formatYearMonth(end)}`;
}

/** "Aug 2019" / "August 2019". */
export function parseNamedMonthYear(value: string): YearMonth | null {
  const match = value.trim().match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (!match) return null;
  const token = match[1]!.slice(0, 3).toLowerCase();
  const month =
    MONTH_LABELS.findIndex((label) => label.toLowerCase() === token) + 1;
  return toYearMonth(Number(match[2]), month);
}

/** Human-readable trip date for titles (e.g. "10 Aug 2019"). */
export function formatTripDate(date: string): string {
  const trimmed = date.trim();
  if (!trimmed) return "";

  const mapsMe = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (mapsMe) {
    return formatDayMonthYear(
      Number(mapsMe[3]),
      Number(mapsMe[2]),
      Number(mapsMe[1]),
    );
  }

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return formatDayMonthYear(Number(iso[3]), Number(iso[2]), Number(iso[1]));
  }

  const dayMonthYear = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dayMonthYear) {
    return formatDayMonthYear(
      Number(dayMonthYear[1]),
      Number(dayMonthYear[2]),
      Number(dayMonthYear[3]),
    );
  }

  const parsed = parseYearMonth(trimmed);
  if (parsed) return formatYearMonth(parsed);
  return trimmed;
}

function formatDayMonthYear(day: number, month: number, year: number): string {
  if (month < 1 || month > 12) return `${day}/${month}/${year}`;
  return `${day} ${MONTH_LABELS[month - 1]} ${year}`;
}

/**
 * Parse mixed Atlas date strings to year+month.
 * Supports MAPS.ME, ISO, DD/MM/YYYY, and M/YYYY.
 * Year-only values land in January of that year.
 */
export function parseYearMonth(date: string): YearMonth | null {
  const trimmed = date.trim();
  if (!trimmed) return null;

  const mapsMe = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (mapsMe) {
    return toYearMonth(Number(mapsMe[1]), Number(mapsMe[2]));
  }

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return toYearMonth(Number(iso[1]), Number(iso[2]));
  }

  const dayMonthYear = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dayMonthYear) {
    return toYearMonth(Number(dayMonthYear[3]), Number(dayMonthYear[2]));
  }

  const monthYear = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYear) {
    return toYearMonth(Number(monthYear[2]), Number(monthYear[1]));
  }

  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) {
    return toYearMonth(Number(yearOnly[1]), 1);
  }

  return null;
}

function toYearMonth(year: number, month: number): YearMonth | null {
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return null;
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export function isOnOrBefore(
  date: string,
  cursor: YearMonth | null,
): boolean {
  if (cursor === null) return false;
  const parsed = parseYearMonth(date);
  if (parsed === null) return false;
  return yearMonthKey(parsed) <= yearMonthKey(cursor);
}

/**
 * Unique months that have at least one dated event, sorted ascending.
 * Empty months are skipped so playback only ticks when something new appears.
 */
export function collectEventMonths(dates: string[]): YearMonth[] {
  const keys = new Set<number>();
  for (const date of dates) {
    const parsed = parseYearMonth(date);
    if (!parsed) continue;
    keys.add(yearMonthKey(parsed));
  }

  return [...keys]
    .sort((a, b) => a - b)
    .map((key) => ({
      year: Math.floor(key / 100),
      month: key % 100,
    }));
}

export function filterByPlaybackMonth<T extends { date: string }>(
  items: T[],
  cursor: YearMonth | null,
  options: { includeUndatedWhenComplete?: boolean; playbackComplete?: boolean } = {},
): T[] {
  const { includeUndatedWhenComplete = false, playbackComplete = false } =
    options;

  return items.filter((item) => {
    const parsed = parseYearMonth(item.date);
    if (parsed === null) {
      return includeUndatedWhenComplete && playbackComplete;
    }
    return isOnOrBefore(item.date, cursor);
  });
}

export function isInYearMonth(date: string, month: YearMonth): boolean {
  const parsed = parseYearMonth(date);
  if (!parsed) return false;
  return yearMonthKey(parsed) === yearMonthKey(month);
}

/**
 * Numeric YYYYMMDD key for chronological ordering within a month.
 * Undated / unparseable values sort last.
 */
export function dateOrderKey(date: string): number {
  const trimmed = date.trim();
  if (!trimmed) return Number.POSITIVE_INFINITY;

  const mapsMe = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (mapsMe) {
    return toDayKey(Number(mapsMe[1]), Number(mapsMe[2]), Number(mapsMe[3]));
  }

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return toDayKey(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const dayMonthYear = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dayMonthYear) {
    return toDayKey(
      Number(dayMonthYear[3]),
      Number(dayMonthYear[2]),
      Number(dayMonthYear[1]),
    );
  }

  const monthYear = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYear) {
    return toDayKey(Number(monthYear[2]), Number(monthYear[1]), 1);
  }

  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) {
    return toDayKey(Number(yearOnly[1]), 1, 1);
  }

  return Number.POSITIVE_INFINITY;
}

function toDayKey(year: number, month: number, day: number): number {
  return year * 10000 + month * 100 + day;
}

export function compareByDateThenId(
  a: { date: string; id: string },
  b: { date: string; id: string },
): number {
  const dateDelta = dateOrderKey(a.date) - dateOrderKey(b.date);
  if (dateDelta !== 0) return dateDelta;
  return a.id.localeCompare(b.id);
}

export type PlaybackStep =
  | { kind: "month"; month: YearMonth }
  | { kind: "route"; routeId: string };

/** Month ticks plus each dated route in that month, in chronological order. */
export function buildPlaybackSteps(
  months: YearMonth[],
  routes: { id: string; date: string }[],
): PlaybackStep[] {
  const steps: PlaybackStep[] = [];

  for (const month of months) {
    steps.push({ kind: "month", month });
    const monthRoutes = routes
      .filter((route) => isInYearMonth(route.date, month))
      .sort(compareByDateThenId);
    for (const route of monthRoutes) {
      steps.push({ kind: "route", routeId: route.id });
    }
  }

  return steps;
}
