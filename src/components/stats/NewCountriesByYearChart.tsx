"use client";

import { useMemo, useRef, useState, type MouseEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { buildCountryVisitMapHref } from "@/lib/map/filter-url";
import { formatTripDate } from "@/lib/map/timeline";
import {
  firstCountryVisitsInYear,
  listFirstCountryVisits,
  summarizeNewCountriesByYear,
  yearProgress,
  type FirstCountryVisit,
} from "@/lib/map/visited-stats";

const ACCENT = "#3d9b6a";
const ACCENT_HOVER = "#54b57f";
const AXIS = "#9bb4bc";
const GRID = "#1e3d48";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type HoverTip = {
  x: number;
  y: number;
  title: string;
  detail: string;
};

type NewCountriesByYearChartProps = {
  visited: Array<{ name: string; date?: string }>;
  initialYear?: number;
};

function tipFromMouse(
  event: MouseEvent<Element>,
  host: HTMLElement | null,
  title: string,
  detail: string,
): HoverTip | null {
  if (!host) return null;
  const box = host.getBoundingClientRect();
  return {
    x: event.clientX - box.left + 12,
    y: event.clientY - box.top - 40,
    title,
    detail,
  };
}

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

  const pad = { top: 16, right: 8, bottom: 84, left: 36 };
  const innerWidth = Math.max(years.length * 28, 560);
  const width = pad.left + innerWidth + pad.right;
  const height = 268;
  const innerHeight = height - pad.top - pad.bottom;
  const slot = innerWidth / Math.max(years.length, 1);
  const barWidth = Math.max(8, slot * 0.62);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-72 w-full min-w-[36rem]"
      role="img"
      aria-label="New countries by year bar chart"
      data-testid="countries-by-year-bars"
    >
      {[0, 0.5, 1].map((fraction) => {
        const value = Math.round(maxCount * (1 - fraction));
        const y = pad.top + innerHeight * fraction;
        return (
          <g key={fraction}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y}
              y2={y}
              stroke={GRID}
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={y + 3}
              textAnchor="end"
              fill={AXIS}
              fontSize="10"
            >
              {value}
            </text>
          </g>
        );
      })}

      {years.map((year, index) => {
        const count = countByYear.get(year) ?? 0;
        const x = pad.left + index * slot + (slot - barWidth) / 2;
        const barHeight = count === 0 ? 0 : Math.max(3, (count / maxCount) * innerHeight);
        const y = pad.top + innerHeight - barHeight;
        const selected = year === selectedYear;
        const fill = selected ? ACCENT_HOVER : ACCENT;
        const labelX = x + barWidth / 2;
        const labelY = height - 28;

        return (
          <g key={year}>
            {count > 0 ? (
              <rect
                x={x}
                y={y}
                width={barWidth}
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
              fill={selected ? "#e8f0f2" : AXIS}
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
              stroke={GRID}
              strokeWidth="1"
            />
            <text
              x={x}
              y={height - 10}
              textAnchor="middle"
              fill={AXIS}
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
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.button !== 0
                ) {
                  return;
                }
                event.preventDefault();
                router.push(href);
              }}
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
  initialYear = 2013,
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
    availableYears.has(initialYear)
      ? initialYear
      : (counts.at(-1)?.year ?? null),
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

      {hover ? (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground shadow-lg"
          style={{ left: hover.x, top: hover.y }}
          data-testid="countries-by-year-tooltip"
        >
          <p className="font-medium">{hover.title}</p>
          <p className="text-muted">{hover.detail}</p>
        </div>
      ) : null}
    </section>
  );
}
