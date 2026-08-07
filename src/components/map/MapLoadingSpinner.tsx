type MapLoadingSpinnerProps = {
  label?: string;
  overlay?: boolean;
};

export function MapLoadingSpinner({
  label = "Loading map data…",
  overlay = false,
}: MapLoadingSpinnerProps) {
  const content = (
    <div
      className="flex flex-col items-center gap-3 text-sm text-muted"
      data-testid="map-loading"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-9 w-9 animate-spin rounded-full border-2 border-muted border-t-accent"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );

  if (!overlay) {
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
