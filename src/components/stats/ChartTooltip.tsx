import type { HoverTip } from "@/lib/stats/chart-hover";

export function ChartTooltip({
  hover,
  testId,
}: {
  hover: HoverTip | null;
  testId: string;
}) {
  if (!hover) return null;

  return (
    <div
      className="pointer-events-none absolute z-10 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground shadow-lg"
      style={{ left: hover.x, top: hover.y }}
      data-testid={testId}
    >
      <p className="font-medium">{hover.title}</p>
      <p className="text-muted">{hover.detail}</p>
    </div>
  );
}
