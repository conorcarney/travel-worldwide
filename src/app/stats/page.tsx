import type { Metadata } from "next";
import { CountryChecklist } from "@/components/stats/CountryChecklist";
import { StatisticsView } from "@/components/stats/StatisticsView";
import { loadCollection } from "@/lib/data";
import {
  buildCountryChecklist,
  summarizeCountryChecklist,
} from "@/lib/map/country-checklist";
import { normalizeCountryList } from "@/lib/map/countries";
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
  const [flightsPayload, surfacePayload, visitedPayload, countryListPayload] =
    await Promise.all([
      loadCollection("flights"),
      loadCollection("busesTrainsAndFerries"),
      loadCollection("visited"),
      loadCollection("countryList"),
    ]);

  const routes = [
    ...normalizeFlights(flightsPayload.data),
    ...normalizeSurfaceRoutes(surfacePayload.data),
  ];
  const visited = normalizeVisited(visitedPayload.data);
  const countries = normalizeCountryList(countryListPayload.data);
  const countryChecklist = buildCountryChecklist(countries, visited);
  const checklistSummary = summarizeCountryChecklist(countryChecklist);

  const statistics = buildExtendedTravelStatistics({
    routes,
    visited,
    flightsRaw: flightsPayload.data,
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl tracking-tight text-foreground">
        Statistics
      </h1>
      <p className="mt-3 text-muted">
        All-time travel totals, countries visited, and your most frequent
        destinations.
      </p>
      <StatisticsView {...statistics} />
      <CountryChecklist
        rows={countryChecklist}
        visitedCount={checklistSummary.visited}
        totalCount={checklistSummary.total}
      />
    </main>
  );
}
