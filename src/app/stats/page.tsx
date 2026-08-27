import type { Metadata } from "next";
import { CountryChecklist } from "@/components/stats/CountryChecklist";
import { CountryRatingsStats } from "@/components/stats/CountryRatingsStats";
import { PassatRoadTripStats } from "@/components/stats/PassatRoadTripStats";
import { StatisticsTabs } from "@/components/stats/StatisticsTabs";
import {
  CountriesByYearTable,
  StatisticsView,
} from "@/components/stats/StatisticsView";
import { loadCollection } from "@/lib/data";
import {
  buildCountryChecklist,
  summarizeCountryChecklist,
} from "@/lib/map/country-checklist";
import { normalizeCountryList } from "@/lib/map/countries";
import { normalizeCountryRatings } from "@/lib/map/country-ratings";
import {
  normalizeFlights,
  normalizeSurfaceRoutes,
  normalizeVisited,
} from "@/lib/map/normalize";
import { buildExtendedTravelStatistics } from "@/lib/map/travel-stats-page";

export const metadata: Metadata = {
  title: "Statistics",
  description:
    "UN countries visited, travel distances, and most visited airports and countries.",
};

export default async function StatsPage() {
  const [
    flightsPayload,
    surfacePayload,
    visitedPayload,
    countryListPayload,
    countryRatingsPayload,
  ] = await Promise.all([
    loadCollection("flights"),
    loadCollection("busesTrainsAndFerries"),
    loadCollection("visited"),
    loadCollection("countryList"),
    loadCollection("countryRatings"),
  ]);

  const routes = [
    ...normalizeFlights(flightsPayload.data),
    ...normalizeSurfaceRoutes(surfacePayload.data),
  ];
  const visited = normalizeVisited(visitedPayload.data);
  const countries = normalizeCountryList(countryListPayload.data);
  const countryChecklist = buildCountryChecklist(countries, visited);
  const checklistSummary = summarizeCountryChecklist(countryChecklist);
  const countryRatings = normalizeCountryRatings(countryRatingsPayload.data);

  const statistics = buildExtendedTravelStatistics({
    routes,
    visited,
    flightsRaw: flightsPayload.data,
  });
  const { countriesByYear, ...statisticsView } = statistics;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl tracking-tight text-foreground">
        Statistics
      </h1>
      <p className="mt-3 text-muted">
        All-time travel totals, countries visited, and your most frequent
        destinations.
      </p>
      <StatisticsTabs
        overall={
          <>
            <StatisticsView {...statisticsView} />
            <CountryChecklist
              rows={countryChecklist}
              visitedCount={checklistSummary.visited}
              totalCount={checklistSummary.total}
            />
            <CountriesByYearTable countriesByYear={countriesByYear} />
          </>
        }
        passat={<PassatRoadTripStats />}
        ratings={<CountryRatingsStats rows={countryRatings} />}
      />
    </main>
  );
}
