import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CountryChecklist } from "@/components/stats/CountryChecklist";
import { CountryRatingsStats } from "@/components/stats/CountryRatingsStats";
import { PassatRoadTripStats } from "@/components/stats/PassatRoadTripStats";
import { StatisticsCarousel } from "@/components/stats/StatisticsCarousel";
import {
  StatisticsView,
} from "@/components/stats/StatisticsView";
import { loadCollection } from "@/lib/data";
import {
  buildCountryChecklist,
  summarizeCountryChecklist,
} from "@/lib/map/country-checklist";
import { normalizeCountryList } from "@/lib/map/countries";
import { normalizeCountryRatings } from "@/lib/map/country-ratings";
import { normalizePassatBorderCrossings } from "@/lib/map/passat-border-crossings";
import {
  normalizeFlights,
  normalizeSurfaceRoutes,
  normalizeVisited,
} from "@/lib/map/normalize";
import { buildExtendedTravelStatistics } from "@/lib/map/travel-stats-page";
import {
  STATISTICS_SLIDES,
  type StatisticsSlideId,
} from "@/lib/stats/statistics-slides";

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
    borderCrossingsPayload,
  ] = await Promise.all([
    loadCollection("flights"),
    loadCollection("busesTrainsAndFerries"),
    loadCollection("visited"),
    loadCollection("countryList"),
    loadCollection("countryRatings"),
    loadCollection("passatBorderCrossings"),
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
  const borderCrossings = normalizePassatBorderCrossings(
    borderCrossingsPayload.data,
  );

  const statistics = buildExtendedTravelStatistics({
    routes,
    visited,
    flightsRaw: flightsPayload.data,
  });
  const { countriesByYear: _countriesByYear, ...statisticsView } = statistics;

  const slideContent = {
    overall: (
      <>
        <StatisticsView
          {...statisticsView}
          visited={visited}
          routes={routes}
        />
        <CountryChecklist
          rows={countryChecklist}
          visitedCount={checklistSummary.visited}
          totalCount={checklistSummary.total}
        />
      </>
    ),
    passat: <PassatRoadTripStats borderCrossings={borderCrossings} />,
    ratings: <CountryRatingsStats rows={countryRatings} />,
  } satisfies Record<StatisticsSlideId, ReactNode>;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl tracking-tight text-foreground">
        Statistics
      </h1>
      <p className="mt-3 text-muted">
        All-time travel totals, countries visited, and your most frequent
        destinations.
      </p>
      <StatisticsCarousel
        slides={STATISTICS_SLIDES.map((slide) => ({
          ...slide,
          content: slideContent[slide.id],
        }))}
      />
    </main>
  );
}
