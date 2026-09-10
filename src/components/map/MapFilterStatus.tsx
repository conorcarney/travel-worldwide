type MapFilterStatusProps = {
  dates: string;
  filters: string;
};

export function MapFilterStatus({ dates, filters }: MapFilterStatusProps) {
  return (
    <header
      className="border-b border-border bg-surface px-4 py-3 sm:px-6"
      data-testid="map-filter-status"
    >
      <p className="font-display text-3xl tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        <span data-testid="map-filter-dates">{dates}</span>
        {filters ? (
          <>
            <span className="px-3 text-muted" aria-hidden>
              ·
            </span>
            <span className="text-muted" data-testid="map-filter-active">
              {filters}
            </span>
          </>
        ) : null}
      </p>
    </header>
  );
}
