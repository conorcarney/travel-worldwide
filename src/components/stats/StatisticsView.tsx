import {
  formatDistanceKm,
} from "@/lib/map/distance";
import {
  modeStats,
  type ExtendedTravelStatistics,
} from "@/lib/map/travel-stats-page";
import { formatTripDate } from "@/lib/map/timeline";
import {
  ModeTable,
  RankedTable,
} from "@/components/stats/SortableStatsTables";

export { CountriesByYearTable } from "@/components/stats/SortableStatsTables";

type StatisticsViewProps = ExtendedTravelStatistics;

function StatCard({
  label,
  value,
  detail,
  testId,
}: {
  label: string;
  value: string;
  detail?: string;
  testId?: string;
}) {
  return (
    <div
      className="rounded-xl border border-border bg-surface/60 px-4 py-4"
      data-testid={testId}
    >
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl text-foreground">{value}</p>
      {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
    </div>
  );
}

export function StatisticsView({
  countriesVisited,
  unMemberTotal,
  allCountriesTotal,
  longestAwayFromHome,
  travel,
  topAirports,
  topCountries,
}: Omit<StatisticsViewProps, "countriesByYear">) {
  const flights = modeStats(travel, "flight");
  const unPct =
    unMemberTotal > 0
      ? Math.round((countriesVisited / unMemberTotal) * 100)
      : 0;
  const allPct =
    allCountriesTotal > 0
      ? Math.round((countriesVisited / allCountriesTotal) * 100)
      : 0;

  return (
    <div className="mt-8 space-y-10" data-testid="statistics-view">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="UN countries visited"
          value={`${countriesVisited.toLocaleString("en-GB")} / ${unMemberTotal}`}
          detail={`${unPct}% of UN member states`}
          testId="statistics-un-countries"
        />
        <StatCard
          label="All countries visited"
          value={`${countriesVisited.toLocaleString("en-GB")} / ${allCountriesTotal}`}
          detail={`${allPct}% including disputed territories`}
          testId="statistics-all-countries"
        />
        <StatCard
          label="Longest time away from home"
          value={
            longestAwayFromHome
              ? `${longestAwayFromHome.days.toLocaleString("en-GB")} days`
              : "—"
          }
          detail={
            longestAwayFromHome
              ? `${formatTripDate(longestAwayFromHome.leftOn)} – ${formatTripDate(longestAwayFromHome.returnedOn)}`
              : "No home leave/return trips recorded yet"
          }
          testId="statistics-longest-away"
        />
        <StatCard
          label="Total flights"
          value={flights.count.toLocaleString("en-GB")}
          detail={formatDistanceKm(flights.distanceKm)}
          testId="statistics-flight-total"
        />
        <StatCard
          label="Total distance"
          value={formatDistanceKm(travel.totalDistanceKm)}
          detail={`${travel.totalCount.toLocaleString("en-GB")} mapped trips`}
          testId="statistics-total-distance"
        />
      </div>

      <ModeTable travel={travel} />

      <RankedTable
        title="Most visited airports"
        description="Ranked by how often each airport or city appears on flight records (departure, arrival, or connection)."
        rows={topAirports}
        countLabel="Visits"
        testId="statistics-top-airports"
      />

      <RankedTable
        title="Most visited countries"
        description="Ranked by total visits, including return trips."
        rows={topCountries}
        countLabel="Visits"
        testId="statistics-top-countries"
      />
    </div>
  );
}
