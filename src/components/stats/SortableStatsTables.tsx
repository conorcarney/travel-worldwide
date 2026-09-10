"use client";

import Link from "next/link";
import {
  formatDistanceKm,
  type TravelStatsSummary,
} from "@/lib/map/distance";
import { buildModeMapHref } from "@/lib/map/filter-url";
import { ROUTE_COLORS } from "@/lib/map/normalize";
import {
  modeStats,
} from "@/lib/map/travel-stats-page";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { useTableSort } from "@/lib/admin/use-table-sort";
import type { TravelMode } from "@/lib/validations/map-data";

const MODE_LABELS: Record<TravelMode, string> = {
  flight: "Flights",
  car: "Car trips",
  bus: "Bus trips",
  train: "Train trips",
  ferry: "Ferries",
};

const MODE_ORDER: TravelMode[] = ["flight", "car", "bus", "train", "ferry"];

const STATS_TH = "pb-2 pr-3 font-medium";

type RankedRow = { label: string; count: number };
type RankedSortKey = "label" | "count";

const RANKED_ACCESSORS: Record<RankedSortKey, (row: RankedRow) => string | number> =
  {
    label: (row) => row.label,
    count: (row) => row.count,
  };

type ModeRowData = {
  mode: TravelMode;
  label: string;
  count: number;
  distanceKm: number;
};

type ModeSortKey = "label" | "count" | "distanceKm";

const MODE_ACCESSORS: Record<ModeSortKey, (row: ModeRowData) => string | number> =
  {
    label: (row) => row.label,
    count: (row) => row.count,
    distanceKm: (row) => row.distanceKm,
  };

export function RankedTable({
  title,
  description,
  rows,
  countLabel,
  testId,
}: {
  title: string;
  description: string;
  rows: RankedRow[];
  countLabel: string;
  testId: string;
}) {
  const { sort, sorted, onSort } = useTableSort(rows, RANKED_ACCESSORS);

  return (
    <section className="mt-10" data-testid={testId}>
      <h2 className="font-display text-lg text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <SortableHeader
                label="Name"
                columnKey="label"
                activeKey={sort?.key ?? null}
                direction={sort?.direction ?? null}
                onSort={onSort}
                className={STATS_TH}
                testId={`${testId}-sort-label`}
              />
              <SortableHeader
                label={countLabel}
                columnKey="count"
                activeKey={sort?.key ?? null}
                direction={sort?.direction ?? null}
                onSort={onSort}
                className="pb-2 font-medium"
                testId={`${testId}-sort-count`}
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
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

function ModeRow({ row }: { row: ModeRowData }) {
  const href = buildModeMapHref(row.mode);
  return (
    <tr className="border-b border-border/60 hover:bg-accent/10">
      <td className="py-2.5 pr-4">
        <Link
          href={href}
          className="inline-flex items-center gap-2 text-foreground hover:text-accent"
          data-testid={`statistics-mode-${row.mode}`}
        >
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: ROUTE_COLORS[row.mode] }}
          />
          {row.label}
        </Link>
      </td>
      <td className="py-2.5 pr-4 tabular-nums text-foreground">
        <Link href={href} className="hover:text-accent">
          {row.count.toLocaleString("en-GB")}
        </Link>
      </td>
      <td className="py-2.5 tabular-nums text-foreground">
        <Link href={href} className="hover:text-accent">
          {formatDistanceKm(row.distanceKm)}
        </Link>
      </td>
    </tr>
  );
}

export function ModeTable({ travel }: { travel: TravelStatsSummary }) {
  const rows = MODE_ORDER.map((mode) => {
    const entry = modeStats(travel, mode);
    return {
      mode,
      label: MODE_LABELS[mode],
      count: entry.count,
      distanceKm: entry.distanceKm,
    };
  });
  const { sort, sorted, onSort } = useTableSort(rows, MODE_ACCESSORS);

  return (
    <section>
      <h2 className="font-display text-lg text-foreground">
        Trips and distance by mode
      </h2>
      <p className="mt-1 text-sm text-muted">
        Counts and great-circle distances from mapped routes. Click a mode to
        open it on the map.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <SortableHeader
                label="Mode"
                columnKey="label"
                activeKey={sort?.key ?? null}
                direction={sort?.direction ?? null}
                onSort={onSort}
                className={STATS_TH}
                testId="statistics-mode-sort-label"
              />
              <SortableHeader
                label="Trips"
                columnKey="count"
                activeKey={sort?.key ?? null}
                direction={sort?.direction ?? null}
                onSort={onSort}
                className={STATS_TH}
                testId="statistics-mode-sort-count"
              />
              <SortableHeader
                label="Distance"
                columnKey="distanceKm"
                activeKey={sort?.key ?? null}
                direction={sort?.direction ?? null}
                onSort={onSort}
                className="pb-2 font-medium"
                testId="statistics-mode-sort-distance"
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <ModeRow key={row.mode} row={row} />
            ))}
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
  );
}
