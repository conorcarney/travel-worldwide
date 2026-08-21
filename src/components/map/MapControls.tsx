"use client";

import { useEffect, useState } from "react";
import type { TravelMode } from "@/lib/validations/map-data";
import { ROUTE_COLORS } from "@/lib/map/normalize";
import type { LayerVisibility } from "@/lib/map/filter-url";
import { TagFilterBar } from "@/components/map/TagFilterBar";
import {
  formatYearMonth,
  yearMonthKey,
  type YearMonth,
} from "@/lib/map/timeline";
import {
  clampYearMonth,
  monthFromIndex,
  monthIndex,
  parseFilterMonthInput,
} from "@/lib/map/years";

export type { LayerVisibility };

const MODE_LABELS: Record<TravelMode, string> = {
  flight: "Flights",
  ferry: "Ferries",
  bus: "Buses",
  train: "Trains",
  car: "Cars",
};

const RANGE_INPUT_CLASS =
  "w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground";

type MapControlsProps = {
  layers: LayerVisibility;
  onToggleLayer: (key: keyof LayerVisibility) => void;
  rangeStart: YearMonth;
  rangeEnd: YearMonth;
  rangeMin: YearMonth;
  rangeMax: YearMonth;
  onRangeStartChange: (value: YearMonth) => void;
  onRangeEndChange: (value: YearMonth) => void;
  onRangeApply: (start: YearMonth, end: YearMonth) => void;
  tagFilters: string[];
  tagOptions: string[];
  onTagFiltersChange: (tags: string[]) => void;
  noTagResults?: boolean;
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
  rangeStart,
  rangeEnd,
  rangeMin,
  rangeMax,
  onRangeStartChange,
  onRangeEndChange,
  onRangeApply,
  tagFilters,
  tagOptions,
  onTagFiltersChange,
  noTagResults = false,
  visibleCounts,
}: MapControlsProps) {
  const modeKeys = Object.keys(MODE_LABELS) as TravelMode[];
  const sliderMin = monthIndex(rangeMin);
  const sliderMax = monthIndex(rangeMax);
  const [fromDraft, setFromDraft] = useState(formatYearMonth(rangeStart));
  const [toDraft, setToDraft] = useState(formatYearMonth(rangeEnd));
  const [filterError, setFilterError] = useState<string | null>(null);

  useEffect(() => {
    setFromDraft(formatYearMonth(rangeStart));
    setToDraft(formatYearMonth(rangeEnd));
    setFilterError(null);
  }, [rangeStart.year, rangeStart.month, rangeEnd.year, rangeEnd.month]);

  function applyTypedRange() {
    const parsedStart = fromDraft.trim()
      ? parseFilterMonthInput(fromDraft, "start")
      : rangeStart;
    const parsedEnd = toDraft.trim()
      ? parseFilterMonthInput(toDraft, "end")
      : rangeEnd;

    if (!parsedStart || !parsedEnd) {
      setFilterError("Use a year like 2015, or a month like Jan 2015.");
      return;
    }

    const startKey = yearMonthKey(parsedStart);
    const endKey = yearMonthKey(parsedEnd);
    const orderedStart = startKey <= endKey ? parsedStart : parsedEnd;
    const orderedEnd = startKey <= endKey ? parsedEnd : parsedStart;
    onRangeApply(
      clampYearMonth(orderedStart, rangeMin, rangeMax),
      clampYearMonth(orderedEnd, rangeMin, rangeMax),
    );
  }

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

        <div className="inline-flex min-w-0 flex-1 flex-wrap items-start gap-2 text-foreground">
          <span className="pt-1.5">Tags</span>
          <TagFilterBar
            selected={tagFilters}
            options={tagOptions}
            onChange={onTagFiltersChange}
          />
          {noTagResults ? (
            <p
              className="pt-1.5 text-xs text-red-400"
              data-testid="tag-filter-empty"
              role="status"
            >
              No results found
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-muted">
          <span>
            From:{" "}
            <span className="text-foreground" data-testid="year-start-value">
              {formatYearMonth(rangeStart)}
            </span>
          </span>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            value={monthIndex(rangeStart)}
            onChange={(event) =>
              onRangeStartChange(
                clampYearMonth(
                  monthFromIndex(Number(event.target.value)),
                  rangeMin,
                  rangeEnd,
                ),
              )
            }
            data-testid="year-start"
            className="w-full"
            aria-valuetext={formatYearMonth(rangeStart)}
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-muted">
          <span>
            To:{" "}
            <span className="text-foreground" data-testid="year-end-value">
              {formatYearMonth(rangeEnd)}
            </span>
          </span>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            value={monthIndex(rangeEnd)}
            onChange={(event) =>
              onRangeEndChange(
                clampYearMonth(
                  monthFromIndex(Number(event.target.value)),
                  rangeStart,
                  rangeMax,
                ),
              )
            }
            data-testid="year-end"
            className="w-full"
            aria-valuetext={formatYearMonth(rangeEnd)}
          />
        </label>
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          applyTypedRange();
        }}
      >
        <label className="flex flex-col gap-1 text-muted">
          <span>From</span>
          <input
            type="text"
            value={fromDraft}
            onChange={(event) => setFromDraft(event.target.value)}
            placeholder="2015 or Jan 2015"
            className={RANGE_INPUT_CLASS}
            data-testid="year-start-input"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1 text-muted">
          <span>To</span>
          <input
            type="text"
            value={toDraft}
            onChange={(event) => setToDraft(event.target.value)}
            placeholder="2020 or Dec 2020"
            className={RANGE_INPUT_CLASS}
            data-testid="year-end-input"
            autoComplete="off"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-accent bg-accent px-3 py-1.5 text-sm text-white"
          data-testid="year-range-apply"
        >
          Apply
        </button>
        {filterError ? (
          <p className="text-xs text-red-400" data-testid="year-range-error">
            {filterError}
          </p>
        ) : (
          <p className="text-xs text-muted">Year or month, then Apply.</p>
        )}
      </form>

      <p className="text-xs text-muted" data-testid="map-visible-counts">
        Showing {visibleCounts.visited} visited · {visibleCounts.routes} routes ·{" "}
        {visibleCounts.bookmarks} bookmarks
        {visibleCounts.asOfLabel ? ` · as of ${visibleCounts.asOfLabel}` : ""}
      </p>
    </div>
  );
}
