import type { MapRoute, MongoFlight, MongoVisited } from "@/lib/validations/map-data";
import { summarizeTravelStats, type TravelStatsSummary } from "@/lib/map/distance";
import { mongoFlightSchema } from "@/lib/validations/map-data";
import { dateOrderKey } from "@/lib/map/timeline";
import { parseTripDate } from "@/lib/trip-date";
import { summarizeNewCountriesByYear, type CountriesByYearRow } from "@/lib/map/visited-stats";

/** UN member states (general assembly). */
export const UN_MEMBER_STATE_COUNT = 196;

/**
 * UN members plus Somaliland, Northern Cyprus, Palestine, Taiwan, Vatican,
 * Abkhazia, Transnistria, Western Sahara, and South Ossetia.
 */
export const ALL_COUNTRY_COUNT = 201;

export type RankedCount = {
  label: string;
  count: number;
};

export type LongestAwayFromHome = {
  days: number;
  leftOn: string;
  returnedOn: string;
};

export type ExtendedTravelStatistics = {
  countriesVisited: number;
  unMemberTotal: number;
  allCountriesTotal: number;
  longestAwayFromHome: LongestAwayFromHome | null;
  travel: TravelStatsSummary;
  countriesByYear: CountriesByYearRow[];
  topAirports: RankedCount[];
  topCountries: RankedCount[];
};

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

/** Unique countries in the Visited collection. */
export function countUniqueCountriesVisited(visited: MongoVisited[]): number {
  const names = new Set<string>();
  for (const item of visited) {
    const name = item.name.trim();
    if (name) names.add(normalizeLabel(name));
  }
  return names.size;
}

/** Count every dated visit, including return trips in `other_visit_dates`. */
export function countCountryVisits(visited: MongoVisited[]): Map<string, RankedCount> {
  const counts = new Map<string, RankedCount>();

  for (const item of visited) {
    const name = item.name.trim();
    if (!name) continue;
    const key = normalizeLabel(name);
    let visits = 0;
    if (item.date?.trim()) visits += 1;
    for (const part of (item.other_visit_dates ?? "").split(",")) {
      if (part.trim()) visits += 1;
    }
    if (visits === 0) visits = 1;

    const existing = counts.get(key);
    if (existing) {
      existing.count += visits;
    } else {
      counts.set(key, { label: name, count: visits });
    }
  }

  return counts;
}

export function rankCountryVisits(
  visited: MongoVisited[],
  limit = 15,
): RankedCount[] {
  return [...countCountryVisits(visited).values()]
    .sort(
      (a, b) =>
        b.count - a.count || a.label.localeCompare(b.label, "en-GB"),
    )
    .slice(0, limit);
}

function parseFlights(data: unknown[]): MongoFlight[] {
  return data.flatMap((item) => {
    const parsed = mongoFlightSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

function bumpAirport(
  counts: Map<string, RankedCount>,
  airport: string | null | undefined,
) {
  const trimmed = airport?.trim();
  if (!trimmed) return;
  const key = normalizeLabel(trimmed);
  const existing = counts.get(key);
  if (existing) {
    existing.count += 1;
  } else {
    counts.set(key, { label: trimmed, count: 1 });
  }
}

/** Rank airports/cities by how often they appear on flight records. */
export function rankAirportVisits(
  flights: MongoFlight[],
  limit = 15,
): RankedCount[] {
  const counts = new Map<string, RankedCount>();
  for (const flight of flights) {
    bumpAirport(counts, flight.departure);
    bumpAirport(counts, flight.arrival);
    bumpAirport(counts, flight.connecting);
  }
  return [...counts.values()]
    .sort(
      (a, b) =>
        b.count - a.count || a.label.localeCompare(b.label, "en-GB"),
    )
    .slice(0, limit);
}

function isHomePlace(place: string): boolean {
  const normalized = normalizeLabel(place);
  if (!normalized) return false;
  if (normalized === "ireland" || normalized.includes("ireland")) return true;
  return (
    normalized === "dublin" ||
    normalized === "cork" ||
    normalized === "galway" ||
    normalized === "limerick" ||
    normalized === "shannon" ||
    normalized === "knock"
  );
}

function parseCalendarDate(date: string): Date | null {
  const parsed = parseTripDate(date);
  if (!parsed) return null;
  return new Date(
    Date.UTC(
      parsed.year,
      parsed.month - 1,
      parsed.day ?? 1,
      parsed.hour ?? 0,
      parsed.minute ?? 0,
      parsed.second ?? 0,
    ),
  );
}

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / msPerDay));
}

type AwayBoundary = {
  kind: "leave" | "return";
  date: Date;
  dateLabel: string;
  sortKey: number;
};

/**
 * Longest continuous stretch abroad, inferred from routes that cross the
 * home boundary (Ireland / Irish airports).
 */
export function longestTimeAwayFromHome(
  routes: MapRoute[],
): LongestAwayFromHome | null {
  const events: AwayBoundary[] = [];

  for (const route of routes) {
    const date = parseCalendarDate(route.date);
    if (!date) continue;
    const fromHome = isHomePlace(route.from);
    const toHome = isHomePlace(route.to);
    const sortKey = dateOrderKey(route.date);

    if (fromHome && !toHome) {
      events.push({
        kind: "leave",
        date,
        dateLabel: route.date,
        sortKey,
      });
    }
    if (!fromHome && toHome) {
      events.push({
        kind: "return",
        date,
        dateLabel: route.date,
        sortKey,
      });
    }
  }

  if (events.length === 0) return null;

  events.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    if (a.kind === b.kind) return 0;
    return a.kind === "leave" ? -1 : 1;
  });

  let awayStart: AwayBoundary | null = null;
  let best: LongestAwayFromHome | null = null;

  for (const event of events) {
    if (event.kind === "leave") {
      if (awayStart === null) awayStart = event;
      continue;
    }
    if (awayStart === null) continue;

    const days = daysBetween(awayStart.date, event.date);
    if (!best || days > best.days) {
      best = {
        days,
        leftOn: awayStart.dateLabel,
        returnedOn: event.dateLabel,
      };
    }
    awayStart = null;
  }

  return best;
}

export function buildExtendedTravelStatistics(input: {
  routes: MapRoute[];
  visited: MongoVisited[];
  flightsRaw: unknown[];
}): ExtendedTravelStatistics {
  const visited = input.visited;
  const flights = parseFlights(input.flightsRaw);

  return {
    countriesVisited: countUniqueCountriesVisited(visited),
    unMemberTotal: UN_MEMBER_STATE_COUNT,
    allCountriesTotal: ALL_COUNTRY_COUNT,
    longestAwayFromHome: longestTimeAwayFromHome(input.routes),
    travel: summarizeTravelStats(input.routes),
    countriesByYear: summarizeNewCountriesByYear(visited),
    topAirports: rankAirportVisits(flights),
    topCountries: rankCountryVisits(visited),
  };
}

export function modeStats(
  summary: TravelStatsSummary,
  mode: MapRoute["mode"],
) {
  return summary.byMode.find((entry) => entry.mode === mode) ?? {
    mode,
    count: 0,
    distanceKm: 0,
  };
}
