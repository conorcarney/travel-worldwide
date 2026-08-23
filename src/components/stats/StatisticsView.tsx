import {
  formatDistanceKm,
  type TravelStatsSummary,
} from "@/lib/map/distance";
import { ROUTE_COLORS } from "@/lib/map/normalize";
import {
  modeStats,
  type ExtendedTravelStatistics,
} from "@/lib/map/travel-stats-page";
import { formatTripDate } from "@/lib/map/timeline";
import type { TravelMode } from "@/lib/validations/map-data";

const MODE_LABELS: Record<TravelMode, string> = {
  flight: "Flights",
  car: "Car trips",
  bus: "Bus trips",
  train: "Train trips",
  ferry: "Ferries",
};

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

function RankedTable({
  title,
  description,
  rows,
  countLabel,
  testId,
}: {
  title: string;
  description: string;
  rows: { label: string; count: number }[];
  countLabel: string;
  testId: string;
}) {
  return (
    <section className="mt-10" data-testid={testId}>
      <h2 className="font-display text-lg text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 font-medium">{countLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-border/60"
                data-testid={`${testId}-${row.label.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <td className="py-2.5 pr-4 text-foreground">{row.label}</td>
                <td className="py-2.5 tabular-nums text-foreground">
                  {row.count.toLocaleString("en-GB")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No data yet.</p>
        ) : null}
      </div>
    </section>
  );
}

function ModeRow({
  mode,
  summary,
}: {
  mode: TravelMode;
  summary: TravelStatsSummary;
}) {
  const entry = modeStats(summary, mode);
  return (
    <tr
      className="border-b border-border/60"
      data-testid={`statistics-mode-${mode}`}
    >
      <td className="py-2.5 pr-4">
        <span className="inline-flex items-center gap-2 text-foreground">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: ROUTE_COLORS[mode] }}
          />
          {MODE_LABELS[mode]}
        </span>
      </td>
      <td className="py-2.5 pr-4 tabular-nums text-foreground">
        {entry.count.toLocaleString("en-GB")}
      </td>
      <td className="py-2.5 tabular-nums text-foreground">
        {formatDistanceKm(entry.distanceKm)}
      </td>
    </tr>
  );
}

export function StatisticsView({
  countriesVisited,
  unMemberTotal,
  allCountriesTotal,
  longestAwayFromHome,
  travel,
  countriesByYear,
  topAirports,
  topCountries,
}: StatisticsViewProps) {
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
          detail={`${allPct}% including disputed territories & Vatican`}
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

      <section>
        <h2 className="font-display text-lg text-foreground">
          Trips and distance by mode
        </h2>
        <p className="mt-1 text-sm text-muted">
          Counts and great-circle distances from mapped routes.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="pb-2 pr-4 font-medium">Mode</th>
                <th className="pb-2 pr-4 font-medium">Trips</th>
                <th className="pb-2 font-medium">Distance</th>
              </tr>
            </thead>
            <tbody>
              <ModeRow mode="flight" summary={travel} />
              <ModeRow mode="car" summary={travel} />
              <ModeRow mode="bus" summary={travel} />
              <ModeRow mode="train" summary={travel} />
              <ModeRow mode="ferry" summary={travel} />
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-medium text-foreground">
                <td className="pt-3 pr-4">Total</td>
                <td className="pt-3 pr-4 tabular-nums">
                  {travel.totalCount.toLocaleString("en-GB")}
                </td>
                <td className="pt-3 tabular-nums">
                  {formatDistanceKm(travel.totalDistanceKm)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

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

      <section className="mt-10">
        <h2 className="font-display text-lg text-foreground">
          New countries by year
        </h2>
        <p className="mt-1 text-sm text-muted">
          First-time visits counted once, in the earliest year with a date.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table
            className="w-full max-w-md text-left text-sm"
            data-testid="countries-by-year-table"
          >
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="pb-2 pr-4 font-medium">Year</th>
                <th className="pb-2 font-medium">New countries</th>
              </tr>
            </thead>
            <tbody>
              {countriesByYear.map((row) => (
                <tr
                  key={row.year}
                  className="border-b border-border/60"
                  data-testid={`countries-by-year-${row.year}`}
                >
                  <td className="py-2.5 pr-4 tabular-nums text-foreground">
                    {row.year}
                  </td>
                  <td className="py-2.5 tabular-nums text-foreground">
                    {row.newCountries.toLocaleString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {countriesByYear.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No dated country visits yet.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
