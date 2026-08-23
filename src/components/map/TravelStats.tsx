import {
  formatDistanceKm,
  type TravelStatsSummary,
} from "@/lib/map/distance";
import { ROUTE_COLORS } from "@/lib/map/normalize";
import type { CountriesByYearRow } from "@/lib/map/visited-stats";
import type { TravelMode } from "@/lib/validations/map-data";

const MODE_LABELS: Record<TravelMode, string> = {
  flight: "Flights",
  ferry: "Ferries",
  bus: "Buses",
  train: "Trains",
  car: "Cars",
};

type TravelStatsProps = {
  stats: TravelStatsSummary;
  countriesByYear: CountriesByYearRow[];
  rangeLabel: string;
  asOfLabel: string;
  className?: string;
};

export function TravelStats({
  stats,
  countriesByYear,
  rangeLabel,
  asOfLabel,
  className = "border-t border-border bg-surface px-4 py-6 sm:px-6",
}: TravelStatsProps) {
  return (
    <section
      className={className}
      data-testid="travel-stats"
      aria-labelledby="travel-stats-heading"
    >
      <h2
        id="travel-stats-heading"
        className="font-display text-xl text-foreground"
      >
        Travel totals
      </h2>
      <p className="mt-1 text-sm text-muted">
        Distances and trip counts for {rangeLabel}, based on mapped routes
        {asOfLabel ? ` · as of ${asOfLabel}` : ""}.
      </p>

      <p
        className="mt-5 font-display text-3xl tracking-tight text-foreground"
        data-testid="travel-stats-total-distance"
      >
        {formatDistanceKm(stats.totalDistanceKm)}
        <span className="ml-2 text-base font-sans text-muted">
          across {stats.totalCount.toLocaleString("en-GB")} trips
          {asOfLabel ? (
            <>
              {" "}
              · <span data-testid="travel-stats-as-of">{asOfLabel}</span>
            </>
          ) : null}
        </span>
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="pb-2 pr-4 font-medium">Mode</th>
              <th className="pb-2 pr-4 font-medium">Trips</th>
              <th className="pb-2 font-medium">Distance</th>
            </tr>
          </thead>
          <tbody>
            {stats.byMode.map((entry) => (
              <tr
                key={entry.mode}
                className="border-b border-border/60"
                data-testid={`travel-stats-row-${entry.mode}`}
              >
                <td className="py-2.5 pr-4">
                  <span className="inline-flex items-center gap-2 text-foreground">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: ROUTE_COLORS[entry.mode] }}
                    />
                    {MODE_LABELS[entry.mode]}
                  </span>
                </td>
                <td
                  className="py-2.5 pr-4 tabular-nums text-foreground"
                  data-testid={`travel-stats-count-${entry.mode}`}
                >
                  {entry.count.toLocaleString("en-GB")}
                </td>
                <td
                  className="py-2.5 tabular-nums text-foreground"
                  data-testid={`travel-stats-distance-${entry.mode}`}
                >
                  {formatDistanceKm(entry.distanceKm)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-10 font-display text-lg text-foreground">
        New countries by year
      </h3>
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
                <td
                  className="py-2.5 tabular-nums text-foreground"
                  data-testid={`countries-by-year-count-${row.year}`}
                >
                  {row.newCountries.toLocaleString("en-GB")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {countriesByYear.length === 0 ? (
          <p className="mt-3 text-sm text-muted" data-testid="countries-by-year-empty">
            No dated country visits in this range yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}
