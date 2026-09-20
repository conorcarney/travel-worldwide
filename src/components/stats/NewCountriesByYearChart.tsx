"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { ChartTooltip } from "@/components/stats/ChartTooltip";
import { YearBarGrid } from "@/components/stats/YearBarGrid";
import { buildCountryVisitMapHref } from "@/lib/map/filter-url";
import { formatTripDate } from "@/lib/map/timeline";
import {
  firstCountryVisitsInYear,
  listFirstCountryVisits,
  summarizeNewCountriesByYear,
  yearProgress,
  type FirstCountryVisit,
} from "@/lib/map/visited-stats";
import { goToMap, tipFromMouse, type HoverTip } from "@/lib/stats/chart-hover";
import {
  YEAR_BAR_AXIS,
  YEAR_BAR_GRID,
  YEAR_BAR_PAD,
  yearBarLayout,
} from "@/lib/stats/year-bar-chart";

const ACCENT = "#3d9b6a";
const ACCENT_HOVER = "#54b57f";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type NewCountriesByYearChartProps = {
  visited: Array<{ name: string; date?: string }>;
  initialYear?: number;
};

function YearBarChart({
  counts,
  selectedYear,
  onSelect,
  onHover,
  hostRef,
}: {
  counts: { year: number; newCountries: number }[];
  selectedYear: number | null;
  onSelect: (year: number) => void;
  onHover: (tip: HoverTip | null) => void;
  hostRef: RefObject<HTMLElement | null>;
}) {
  const years = counts.map((row) => row.year);
  const countByYear = new Map(counts.map((row) => [row.year, row.newCountries]));
  const maxCount = Math.max(1, ...counts.map((row) => row.newCountries));
  const layout = yearBarLayout(years.length);

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="h-72 w-full min-w-[36rem]"
      role="img"
      aria-label="New countries by year bar chart"
      data-testid="countries-by-year-bars"
    >
      <YearBarGrid
        width={layout.width}
        innerHeight={layout.innerHeight}
        maxCount={maxCount}
      />

      {years.map((year, index) => {
        const count = countByYear.get(year) ?? 0;
        const x =
          YEAR_BAR_PAD.left +
          index * layout.slot +
          (layout.slot - layout.barWidth) / 2;
        const barHeight =
          count === 0 ? 0 : Math.max(3, (count / maxCount) * layout.innerHeight);
        const y = YEAR_BAR_PAD.top + layout.innerHeight - barHeight;
        const selected = year === selectedYear;
        const fill = selected ? ACCENT_HOVER : ACCENT;
        const labelX = x + layout.barWidth / 2;
        const labelY = layout.height - 28;

        return (
          <g key={year}>
            {count > 0 ? (
              <rect
                x={x}
                y={y}
                width={layout.barWidth}
                height={barHeight}
                rx="3"
                fill={fill}
                stroke={selected ? "#e8f0f2" : "transparent"}
                strokeWidth={selected ? 2 : 0}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                focusable="true"
                aria-label={`${year}, ${count} new ${count === 1 ? "country" : "countries"}`}
                aria-pressed={selected}
                data-testid={`countries-by-year-bar-${year}`}
                onMouseEnter={(event) =>
                  onHover(
                    tipFromMouse(
                      event,
                      hostRef.current,
                      String(year),
                      `${count.toLocaleString("en-GB")} new ${count === 1 ? "country" : "countries"}`,
                    ),
                  )
                }
                onMouseMove={(event) =>
                  onHover(
                    tipFromMouse(
                      event,
                      hostRef.current,
                      String(year),
                      `${count.toLocaleString("en-GB")} new ${count === 1 ? "country" : "countries"}`,
                    ),
                  )
                }
                onMouseLeave={() => onHover(null)}
                onClick={() => onSelect(year)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(year);
                  }
                }}
              />
            ) : null}
            <text
              x={labelX}
              y={labelY}
              textAnchor="end"
              fill={selected ? "#e8f0f2" : YEAR_BAR_AXIS}
              fontSize="10"
              transform={`rotate(-60 ${labelX} ${labelY})`}
            >
              {year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function YearVisitTimeline({
  year,
  visits,
  onHover,
  hostRef,
}: {
  year: number;
  visits: FirstCountryVisit[];
  onHover: (tip: HoverTip | null) => void;
  hostRef: RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const pad = { top: 12, right: 16, bottom: 36, left: 118 };
  const rowHeight = 28;
  const innerWidth = 520;
  const width = pad.left + innerWidth + pad.right;
  const height = pad.top + pad.bottom + Math.max(visits.length, 1) * rowHeight;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ minHeight: Math.max(140, visits.length * 28 + 48) }}
      role="img"
      aria-label={`First country visits in ${year}`}
      data-testid="countries-in-year-chart"
    >
      {MONTHS.map((label, index) => {
        const x = pad.left + (index / 11) * innerWidth;
        return (
          <g key={label}>
            <line
              x1={x}
              x2={x}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke={YEAR_BAR_GRID}
              strokeWidth="1"
            />
            <text
              x={x}
              y={height - 10}
              textAnchor="middle"
              fill={YEAR_BAR_AXIS}
              fontSize="10"
            >
              {label}
            </text>
          </g>
        );
      })}

      {visits.map((visit, index) => {
        const progress = yearProgress(visit.date, year) ?? 0;
        const y = pad.top + index * rowHeight + rowHeight / 2;
        const x = pad.left + progress * innerWidth;
        const href = buildCountryVisitMapHref(visit.name, visit.date);
        return (
          <g key={`${visit.name}-${visit.date}`}>
            <text
              x={pad.left - 10}
              y={y + 4}
              textAnchor="end"
              fill="#e8f0f2"
              fontSize="12"
            >
              {visit.name}
            </text>
            <line
              x1={pad.left}
              x2={x}
              y1={y}
              y2={y}
              stroke={ACCENT}
              strokeWidth="2"
              opacity="0.35"
            />
            <a
              href={href}
              aria-label={`Open ${visit.name} on the map for ${formatTripDate(visit.date)}`}
              data-testid={`countries-in-year-point-${visit.name}`}
              className="cursor-pointer"
              onClick={(event) => goToMap(event, href, router.push)}
              onMouseEnter={(event) =>
                onHover(
                  tipFromMouse(
                    event,
                    hostRef.current,
                    visit.name,
                    `${formatTripDate(visit.date)} · Open on map`,
                  ),
                )
              }
              onMouseMove={(event) =>
                onHover(
                  tipFromMouse(
                    event,
                    hostRef.current,
                    visit.name,
                    `${formatTripDate(visit.date)} · Open on map`,
                  ),
                )
              }
              onMouseLeave={() => onHover(null)}
            >
              <circle cx={x} cy={y} r="10" fill="transparent" />
              <circle cx={x} cy={y} r="6" fill={ACCENT} className="cursor-pointer" />
            </a>
          </g>
        );
      })}
    </svg>
  );
}

export function NewCountriesByYearChart({
  visited,
  initialYear,
}: NewCountriesByYearChartProps) {
  const firstVisits = useMemo(() => listFirstCountryVisits(visited), [visited]);
  const counts = useMemo(
    () => summarizeNewCountriesByYear(visited),
    [visited],
  );
  const availableYears = useMemo(
    () => new Set(counts.map((row) => row.year)),
    [counts],
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(() =>
    initialYear !== undefined && availableYears.has(initialYear)
      ? initialYear
      : null,
  );
  const [hover, setHover] = useState<HoverTip | null>(null);
  const hostRef = useRef<HTMLElement>(null);

  const yearVisits = selectedYear
    ? firstCountryVisitsInYear(firstVisits, selectedYear)
    : [];

  return (
    <section className="relative" data-testid="countries-by-year" ref={hostRef}>
      <h2 className="font-display text-lg text-foreground">
        New countries by year
      </h2>
      <p className="mt-1 text-sm text-muted">
        First-time visits counted once, in the earliest year with a date. Hover
        a bar for the count; click a year to plot those first visits by date.
        Click a country to open it on the map for that first visit.
      </p>

      {counts.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No dated country visits yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface/40 p-3 pb-10">
          <YearBarChart
            counts={counts}
            selectedYear={selectedYear}
            onSelect={setSelectedYear}
            onHover={setHover}
            hostRef={hostRef}
          />
        </div>
      )}

      {selectedYear !== null ? (
        <div className="mt-8" data-testid="countries-in-year">
          <h3 className="font-display text-lg text-foreground">
            First visits in {selectedYear}
          </h3>
          <p className="mt-1 text-sm text-muted">
            Each point is the first dated visit to that country, placed on the
            calendar for {selectedYear}. Click a point to open the map on that
            first-visit date, with the country as a trip tag.
          </p>
          {yearVisits.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No first-time country visits in {selectedYear}.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface/40 p-3">
              <YearVisitTimeline
                year={selectedYear}
                visits={yearVisits}
                onHover={setHover}
                hostRef={hostRef}
              />
            </div>
          )}
        </div>
      ) : null}

      <ChartTooltip hover={hover} testId="countries-by-year-tooltip" />
    </section>
  );
}
