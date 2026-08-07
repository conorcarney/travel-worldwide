import {
  formatDistanceKm,
  type TravelStatsSummary,
} from "@/lib/map/distance";
import { ROUTE_COLORS } from "@/lib/map/normalize";
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
  yearStart: number;
  yearEnd: number;
};

export function TravelStats({ stats, yearStart, yearEnd }: TravelStatsProps) {
  const yearLabel =
    yearStart === yearEnd ? String(yearStart) : `${yearStart}–${yearEnd}`;

  return (
    <section
      className="border-t border-border bg-surface px-4 py-6 sm:px-6"
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
        Distances and trip counts for {yearLabel}, based on mapped routes.
      </p>

      <p
        className="mt-5 font-display text-3xl tracking-tight text-foreground"
        data-testid="travel-stats-total-distance"
      >
        {formatDistanceKm(stats.totalDistanceKm)}
        <span className="ml-2 text-base font-sans text-muted">
          across {stats.totalCount.toLocaleString("en-GB")} trips
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
    </section>
  );
}
