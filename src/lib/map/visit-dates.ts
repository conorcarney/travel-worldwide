import { isOnOrBefore, parseYearMonth, type YearMonth } from "@/lib/map/timeline";
import { inMonthRange } from "@/lib/map/years";

/** First visit plus comma-separated return visits. */
export function allVisitDates(item: {
  date?: string;
  other_visit_dates?: string;
}): string[] {
  const dates: string[] = [];
  const first = item.date?.trim() ?? "";
  if (first) dates.push(first);

  const others = item.other_visit_dates ?? "";
  for (const part of others.split(",")) {
    const trimmed = part.trim();
    if (trimmed) dates.push(trimmed);
  }
  return dates;
}

function parseableDatesInRange(
  dates: string[],
  start: YearMonth,
  end: YearMonth,
): string[] {
  return dates.filter((date) => {
    if (!parseYearMonth(date)) return false;
    return inMonthRange(date, start, end);
  });
}

/**
 * Whether a visited country should be highlighted for the current filter
 * (and playback cursor). Return visits in `other_visit_dates` count.
 */
export function isVisitedInFilter(
  item: { date?: string; other_visit_dates?: string },
  start: YearMonth,
  end: YearMonth,
  cursor: YearMonth | null,
  playbackComplete: boolean,
): boolean {
  const dates = allVisitDates(item);
  const inWindow = parseableDatesInRange(dates, start, end);

  if (inWindow.length === 0) {
    return dates.length === 0 && playbackComplete;
  }
  if (playbackComplete) return true;
  return inWindow.some((date) => isOnOrBefore(date, cursor));
}
