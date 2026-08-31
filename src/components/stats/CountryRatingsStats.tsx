"use client";

import {
  formatRatingScore,
  formatReturnVisit,
  type CountryRatingRow,
} from "@/lib/map/country-ratings";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { useTableSort } from "@/lib/admin/use-table-sort";

const STATS_TH = "pb-2 pr-3 font-medium";
const NULL_SCORE = Number.NEGATIVE_INFINITY;

function scoreCell(value: number | null, digits = 2) {
  return (
    <td className="py-2.5 pr-3 tabular-nums text-foreground">
      {formatRatingScore(value, digits)}
    </td>
  );
}

type CountryRatingsStatsProps = {
  rows: CountryRatingRow[];
};

type RatingSortKey =
  | "name"
  | "continent"
  | "culture"
  | "entertainment"
  | "landscapes"
  | "price"
  | "easeOfEntry"
  | "food"
  | "experiences"
  | "drivers"
  | "roads"
  | "rating"
  | "returnVisit"
  | "reason";

const RATING_ACCESSORS: Record<
  RatingSortKey,
  (row: CountryRatingRow) => string | number
> = {
  name: (row) => row.name,
  continent: (row) => row.continent,
  culture: (row) => row.culture,
  entertainment: (row) => row.entertainment,
  landscapes: (row) => row.landscapes,
  price: (row) => row.price,
  easeOfEntry: (row) => row.easeOfEntry,
  food: (row) => row.food,
  experiences: (row) => row.experiences,
  drivers: (row) => row.drivers ?? NULL_SCORE,
  roads: (row) => row.roads ?? NULL_SCORE,
  rating: (row) => row.rating ?? NULL_SCORE,
  returnVisit: (row) => formatReturnVisit(row.returnVisit),
  reason: (row) => row.reason,
};

const RATING_COLUMNS: { key: RatingSortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "continent", label: "Continent" },
  { key: "culture", label: "Culture" },
  { key: "entertainment", label: "Entertainment" },
  { key: "landscapes", label: "Landscapes" },
  { key: "price", label: "Price" },
  { key: "easeOfEntry", label: "Ease of entry" },
  { key: "food", label: "Food" },
  { key: "experiences", label: "Experiences" },
  { key: "drivers", label: "Drivers" },
  { key: "roads", label: "Roads" },
  { key: "rating", label: "Rating" },
  { key: "returnVisit", label: "Return" },
  { key: "reason", label: "Reason" },
];

export function CountryRatingsStats({ rows }: CountryRatingsStatsProps) {
  const { sort, sorted, onSort } = useTableSort(rows, RATING_ACCESSORS);

  return (
    <div className="mt-8 space-y-6" data-testid="country-ratings-stats">
      <section>
        <h2 className="font-display text-lg text-foreground">
          My country ratings
        </h2>
        <p className="mt-1 text-sm text-muted">
          Personal scores by category. Overall rating is the average of those
          scores (drivers and roads only when set).{" "}
          {rows.length.toLocaleString("en-GB")} places rated.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[72rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                {RATING_COLUMNS.map((column, index) => (
                  <SortableHeader
                    key={column.key}
                    label={column.label}
                    columnKey={column.key}
                    activeKey={sort?.key ?? null}
                    direction={sort?.direction ?? null}
                    onSort={onSort}
                    className={
                      index === RATING_COLUMNS.length - 1
                        ? "pb-2 font-medium"
                        : STATS_TH
                    }
                    testId={`country-ratings-sort-${column.key}`}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={`${row.name}-${row.continent}`}
                  className="border-b border-border/60 align-top"
                  data-testid={`country-rating-${row.name.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <td className="py-2.5 pr-3 text-foreground">{row.name}</td>
                  <td className="py-2.5 pr-3 text-muted">{row.continent}</td>
                  {scoreCell(row.culture, 1)}
                  {scoreCell(row.entertainment, 1)}
                  {scoreCell(row.landscapes, 1)}
                  {scoreCell(row.price, 1)}
                  {scoreCell(row.easeOfEntry, 1)}
                  {scoreCell(row.food, 1)}
                  {scoreCell(row.experiences, 1)}
                  {scoreCell(row.drivers, 1)}
                  {scoreCell(row.roads, 1)}
                  {scoreCell(row.rating, 2)}
                  <td className="py-2.5 pr-3 text-foreground">
                    {formatReturnVisit(row.returnVisit)}
                  </td>
                  <td className="py-2.5 text-muted">{row.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No country ratings yet. Add them from the admin page.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
