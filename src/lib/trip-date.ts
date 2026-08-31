export type ParsedTripDate = {
  year: number;
  month: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
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

/** Optional `HH:MM` / `HH:MM:SS`, with a leading space or `T`. */
const TIME =
  "(?:[ T](\\d{1,2}):(\\d{2})(?::(\\d{2}))?)?(?:Z|[+-]\\d{2}(?::?\\d{2})?)?";

function monthFromName(value: string): number {
  const token = value.slice(0, 3).toLowerCase();
  return MONTH_LABELS.findIndex((label) => label.toLowerCase() === token) + 1;
}

function optionalClock(
  hour: string | undefined,
  minute: string | undefined,
  second: string | undefined,
): Pick<ParsedTripDate, "hour" | "minute" | "second"> {
  if (hour === undefined || minute === undefined) return {};
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isFinite(h) || h < 0 || h > 23) return {};
  if (!Number.isFinite(m) || m < 0 || m > 59) return {};
  const result: Pick<ParsedTripDate, "hour" | "minute" | "second"> = {
    hour: h,
    minute: m,
  };
  if (second !== undefined) {
    const s = Number(second);
    if (Number.isFinite(s) && s >= 0 && s <= 59) result.second = s;
  }
  return result;
}

function toParsed(
  year: number,
  month: number,
  day?: number,
  hour?: string,
  minute?: string,
  second?: string,
): ParsedTripDate | null {
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return null;
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  const parsed: ParsedTripDate = { year, month };
  if (day !== undefined && Number.isFinite(day) && day >= 1 && day <= 31) {
    parsed.day = day;
  }
  Object.assign(parsed, optionalClock(hour, minute, second));
  return parsed;
}

/**
 * Parse mixed Atlas date strings, including optional 24-hour time
 * (`19/01/2023 14:30`, MAPS.ME timestamps, ISO date-times).
 */
export function parseTripDate(value: string): ParsedTripDate | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const mapsMe = trimmed.match(
    new RegExp(`^(\\d{4})/(\\d{1,2})/(\\d{1,2})${TIME}`),
  );
  if (mapsMe) {
    return toParsed(
      Number(mapsMe[1]),
      Number(mapsMe[2]),
      Number(mapsMe[3]),
      mapsMe[4],
      mapsMe[5],
      mapsMe[6],
    );
  }

  const iso = trimmed.match(
    new RegExp(`^(\\d{4})-(\\d{1,2})-(\\d{1,2})${TIME}`),
  );
  if (iso) {
    return toParsed(
      Number(iso[1]),
      Number(iso[2]),
      Number(iso[3]),
      iso[4],
      iso[5],
      iso[6],
    );
  }

  const dayMonthYear = trimmed.match(
    new RegExp(`^(\\d{1,2})/(\\d{1,2})/(\\d{4})${TIME}$`),
  );
  if (dayMonthYear) {
    return toParsed(
      Number(dayMonthYear[3]),
      Number(dayMonthYear[2]),
      Number(dayMonthYear[1]),
      dayMonthYear[4],
      dayMonthYear[5],
      dayMonthYear[6],
    );
  }

  const namedDay = trimmed.match(
    new RegExp(`^(\\d{1,2})\\s+([A-Za-z]{3,9})\\s+(\\d{4})${TIME}$`),
  );
  if (namedDay) {
    return toParsed(
      Number(namedDay[3]),
      monthFromName(namedDay[2]!),
      Number(namedDay[1]),
      namedDay[4],
      namedDay[5],
      namedDay[6],
    );
  }

  const namedMonth = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (namedMonth) {
    return toParsed(Number(namedMonth[2]), monthFromName(namedMonth[1]!));
  }

  const monthYear = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYear) {
    return toParsed(Number(monthYear[2]), Number(monthYear[1]));
  }

  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) {
    return toParsed(Number(yearOnly[1]), 1);
  }

  return null;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Lexicographic sort key. Month-only dates use day `00` so they sort
 * before day-level dates in that month. Time is always padded so
 * `19/01/2023` and `19/01/2023 14:30` compare safely against other days.
 */
export function tripDateSortKey(date: string): string {
  const trimmed = date.trim();
  if (!trimmed) return "";
  const parsed = parseTripDate(trimmed);
  if (!parsed) return trimmed;
  return [
    String(parsed.year),
    pad2(parsed.month),
    pad2(parsed.day ?? 0),
    pad2(parsed.hour ?? 0),
    pad2(parsed.minute ?? 0),
    pad2(parsed.second ?? 0),
  ].join("");
}

/**
 * Numeric YYYYMMDDHHMMSS key for chronological ordering.
 * Month-only dates use day 1. Undated / unparseable values sort last.
 */
export function tripDateOrderKey(date: string): number {
  const parsed = parseTripDate(date);
  if (!parsed) return Number.POSITIVE_INFINITY;
  return (
    parsed.year * 10_000_000_000 +
    parsed.month * 100_000_000 +
    (parsed.day ?? 1) * 1_000_000 +
    (parsed.hour ?? 0) * 10_000 +
    (parsed.minute ?? 0) * 100 +
    (parsed.second ?? 0)
  );
}

export function formatClock(parsed: ParsedTripDate): string {
  if (parsed.hour === undefined || parsed.minute === undefined) return "";
  const clock = `${pad2(parsed.hour)}:${pad2(parsed.minute)}`;
  if (parsed.second) {
    return `${clock}:${pad2(parsed.second)}`;
  }
  return clock;
}
