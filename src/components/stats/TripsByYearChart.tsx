"use client";

import { useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildModeMapHref } from "@/lib/map/filter-url";
import { ROUTE_COLORS } from "@/lib/map/normalize";
import type { TravelMode } from "@/lib/validations/map-data";
import type { TripsByYearRow } from "@/lib/stats/trips-by-year";

const AXIS = "#9bb4bc";
const GRID = "#1e3d48";

type HoverTip = {
  x: number;
  y: number;
  title: string;
  detail: string;
};

type TripsByYearChartProps = {
  mode: TravelMode;
  label: string;
  counts: TripsByYearRow[];
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

function goToMap(
  event: MouseEvent<HTMLElement>,
  href: string,
  push: (url: string) => void,
) {
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
  push(href);
}

export function TripsByYearChart({
  mode,
  label,
  counts,
}: TripsByYearChartProps) {
  const router = useRouter();
  const [hover, setHover] = useState<HoverTip | null>(null);
  const hostRef = useRef<HTMLElement>(null);
  const fill = ROUTE_COLORS[mode];
  const years = counts.map((row) => row.year);
  const maxCount = Math.max(1, ...counts.map((row) => row.count));
  const allYearsHref = buildModeMapHref(mode);

  const pad = { top: 16, right: 8, bottom: 84, left: 36 };
  const innerWidth = Math.max(years.length * 28, 560);
  const width = pad.left + innerWidth + pad.right;
  const height = 268;
  const innerHeight = height - pad.top - pad.bottom;
  const slot = innerWidth / Math.max(years.length, 1);
  const barWidth = Math.max(8, slot * 0.62);

  return (
    <section
      className="relative mt-6"
      data-testid="trips-by-year"
      ref={hostRef}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg text-foreground">
          {label} by year
        </h3>
        <Link
          href={allYearsHref}
          className="text-sm text-accent hover:underline"
          data-testid="trips-by-year-map-link"
        >
          Open all years on map
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        Dated {label.toLowerCase()} only. Years with none are left out. Click a
        year to open it on the map.
      </p>

      {counts.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No dated {label.toLowerCase()} yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface/40 p-3 pb-10">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-72 w-full min-w-[36rem]"
            role="img"
            aria-label={`${label} by year bar chart`}
            data-testid="trips-by-year-bars"
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

            {counts.map((row, index) => {
              const x = pad.left + index * slot + (slot - barWidth) / 2;
              const barHeight = Math.max(3, (row.count / maxCount) * innerHeight);
              const y = pad.top + innerHeight - barHeight;
              const labelX = x + barWidth / 2;
              const labelY = height - 28;
              const unit = row.count === 1 ? "trip" : "trips";
              const href = buildModeMapHref(mode, row.year);
              const tip = `${row.count.toLocaleString("en-GB")} ${unit} · Open on map`;
              return (
                <g key={row.year}>
                  <a
                    href={href}
                    aria-label={`Open ${label.toLowerCase()} from ${row.year} on the map`}
                    data-testid={`trips-by-year-bar-${row.year}`}
                    className="cursor-pointer"
                    onClick={(event) => goToMap(event, href, router.push)}
                    onMouseEnter={(event) =>
                      setHover(
                        tipFromMouse(event, hostRef.current, String(row.year), tip),
                      )
                    }
                    onMouseMove={(event) =>
                      setHover(
                        tipFromMouse(event, hostRef.current, String(row.year), tip),
                      )
                    }
                    onMouseLeave={() => setHover(null)}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="3"
                      fill={fill}
                    />
                  </a>
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="end"
                    fill={AXIS}
                    fontSize="10"
                    transform={`rotate(-60 ${labelX} ${labelY})`}
                  >
                    {row.year}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {hover ? (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground shadow-lg"
          style={{ left: hover.x, top: hover.y }}
          data-testid="trips-by-year-tooltip"
        >
          <p className="font-medium">{hover.title}</p>
          <p className="text-muted">{hover.detail}</p>
        </div>
      ) : null}
    </section>
  );
}
