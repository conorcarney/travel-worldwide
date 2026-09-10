type MapLoadingSpinnerProps = {
  label?: string;
  overlay?: boolean;
  compact?: boolean;
};

export function MapLoadingSpinner({
  label = "Loading map data…",
  overlay = false,
  compact = false,
}: MapLoadingSpinnerProps) {
  const content = (
    <div
      className={`flex flex-col items-center text-muted ${compact ? "gap-2 text-xs" : "gap-3 text-sm"}`}
      data-testid="map-loading"
      role="status"
      aria-live="polite"
    >
      <span
        className={`animate-spin rounded-full border-2 border-muted border-t-accent ${compact ? "h-8 w-8" : "h-9 w-9"}`}
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );

  if (!overlay) {
    if (compact) return content;
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/55 backdrop-blur-[1px]">
      {content}
    </div>
  );
}
