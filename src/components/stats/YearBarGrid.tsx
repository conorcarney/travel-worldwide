import {
  YEAR_BAR_AXIS,
  YEAR_BAR_GRID,
  YEAR_BAR_PAD,
} from "@/lib/stats/year-bar-chart";

export function YearBarGrid({
  width,
  innerHeight,
  maxCount,
}: {
  width: number;
  innerHeight: number;
  maxCount: number;
}) {
  return (
    <g>
      {[0, 0.5, 1].map((fraction) => {
        const value = Math.round(maxCount * (1 - fraction));
        const y = YEAR_BAR_PAD.top + innerHeight * fraction;
        return (
          <g key={fraction}>
            <line
              x1={YEAR_BAR_PAD.left}
              x2={width - YEAR_BAR_PAD.right}
              y1={y}
              y2={y}
              stroke={YEAR_BAR_GRID}
              strokeWidth="1"
            />
            <text
              x={YEAR_BAR_PAD.left - 8}
              y={y + 3}
              textAnchor="end"
              fill={YEAR_BAR_AXIS}
              fontSize="10"
            >
              {value}
            </text>
          </g>
        );
      })}
    </g>
  );
}
