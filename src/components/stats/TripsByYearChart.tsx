"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChartTooltip } from "@/components/stats/ChartTooltip";
import { YearBarGrid } from "@/components/stats/YearBarGrid";
import { buildModeMapHref } from "@/lib/map/filter-url";
import { ROUTE_COLORS } from "@/lib/map/normalize";
import { goToMap, tipFromMouse, type HoverTip } from "@/lib/stats/chart-hover";
import {
  YEAR_BAR_AXIS,
  YEAR_BAR_PAD,
  yearBarLayout,
} from "@/lib/stats/year-bar-chart";
import type { TravelMode } from "@/lib/validations/map-data";
import type { TripsByYearRow } from "@/lib/stats/trips-by-year";

type TripsByYearChartProps = {
  mode: TravelMode;
  label: string;
  counts: TripsByYearRow[];
};

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
  const layout = yearBarLayout(years.length);

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
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="h-72 w-full min-w-[36rem]"
            role="img"
            aria-label={`${label} by year bar chart`}
            data-testid="trips-by-year-bars"
          >
            <YearBarGrid
              width={layout.width}
              innerHeight={layout.innerHeight}
              maxCount={maxCount}
            />

            {counts.map((row, index) => {
              const x =
                YEAR_BAR_PAD.left +
                index * layout.slot +
                (layout.slot - layout.barWidth) / 2;
              const barHeight = Math.max(
                3,
                (row.count / maxCount) * layout.innerHeight,
              );
              const y = YEAR_BAR_PAD.top + layout.innerHeight - barHeight;
              const labelX = x + layout.barWidth / 2;
              const labelY = layout.height - 28;
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
                      width={layout.barWidth}
                      height={barHeight}
                      rx="3"
                      fill={fill}
                    />
                  </a>
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="end"
                    fill={YEAR_BAR_AXIS}
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

      <ChartTooltip hover={hover} testId="trips-by-year-tooltip" />
    </section>
  );
}
