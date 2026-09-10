import type { TravelMode } from "@/lib/validations/map-data";
import { parseYear } from "@/lib/map/years";

export type TripsByYearRow = {
  year: number;
  count: number;
};

/** Trip counts per calendar year for one mode. Years with none are omitted. */
export function summarizeTripsByYear(
  routes: Array<{ mode: TravelMode; date: string }>,
  mode: TravelMode,
): TripsByYearRow[] {
  const counts = new Map<number, number>();
  for (const route of routes) {
    if (route.mode !== mode) continue;
    const year = parseYear(route.date);
    if (year === null) continue;
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([year, count]) => ({ year, count }));
}
