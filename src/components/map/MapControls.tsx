"use client";

import type { TravelMode } from "@/lib/validations/map-data";
import { ROUTE_COLORS } from "@/lib/map/normalize";

export type LayerVisibility = {
  visited: boolean;
  bookmarks: boolean;
} & Record<TravelMode, boolean>;

const MODE_LABELS: Record<TravelMode, string> = {
  flight: "Flights",
  ferry: "Ferries",
  bus: "Buses",
  train: "Trains",
  car: "Cars",
};

type MapControlsProps = {
  layers: LayerVisibility;
  onToggleLayer: (key: keyof LayerVisibility) => void;
  yearStart: number;
  yearEnd: number;
  yearMin: number;
  yearMax: number;
  onYearStartChange: (year: number) => void;
  onYearEndChange: (year: number) => void;
  visibleCounts: {
    visited: number;
    routes: number;
    bookmarks: number;
    asOfLabel?: string;
  };
};

export function MapControls({
  layers,
  onToggleLayer,
  yearStart,
  yearEnd,
  yearMin,
  yearMax,
  onYearStartChange,
  onYearEndChange,
  visibleCounts,
}: MapControlsProps) {
  const modeKeys = Object.keys(MODE_LABELS) as TravelMode[];

  return (
    <div
      className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-3 text-sm sm:px-6"
      data-testid="map-controls"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="inline-flex items-center gap-2 text-foreground">
          <input
            type="checkbox"
            checked={layers.visited}
            onChange={() => onToggleLayer("visited")}
            data-testid="layer-visited"
          />
          Visited countries
        </label>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: "#3d9b6a" }}
            aria-hidden
          />
          Blog
          <span
            className="ml-2 inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: "#e67e22" }}
            aria-hidden
          />
          Visited only
        </span>

        {modeKeys.map((mode) => (
          <label
            key={mode}
            className="inline-flex items-center gap-2 text-foreground"
          >
            <input
              type="checkbox"
              checked={layers[mode]}
              onChange={() => onToggleLayer(mode)}
              data-testid={`layer-${mode}`}
            />
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: ROUTE_COLORS[mode] }}
              aria-hidden
            />
            {MODE_LABELS[mode]}
          </label>
        ))}

        <label className="inline-flex items-center gap-2 text-foreground">
          <input
            type="checkbox"
            checked={layers.bookmarks}
            onChange={() => onToggleLayer("bookmarks")}
            data-testid="layer-bookmarks"
          />
          <span
            className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400"
            aria-hidden
          />
          Bookmarks
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-muted">
          <span>
            From year:{" "}
            <span className="text-foreground" data-testid="year-start-value">
              {yearStart}
            </span>
          </span>
          <input
            type="range"
            min={yearMin}
            max={yearMax}
            value={yearStart}
            onChange={(event) => onYearStartChange(Number(event.target.value))}
            data-testid="year-start"
            className="w-full"
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-muted">
          <span>
            To year:{" "}
            <span className="text-foreground" data-testid="year-end-value">
              {yearEnd}
            </span>
          </span>
          <input
            type="range"
            min={yearMin}
            max={yearMax}
            value={yearEnd}
            onChange={(event) => onYearEndChange(Number(event.target.value))}
            data-testid="year-end"
            className="w-full"
          />
        </label>
      </div>

      <p className="text-xs text-muted" data-testid="map-visible-counts">
        Showing {visibleCounts.visited} visited · {visibleCounts.routes} routes ·{" "}
        {visibleCounts.bookmarks} bookmarks
        {visibleCounts.asOfLabel ? ` · as of ${visibleCounts.asOfLabel}` : ""}
      </p>
    </div>
  );
}
