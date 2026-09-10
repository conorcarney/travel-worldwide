type MapFilterStatusProps = {
  dates: string;
  tags: string;
};

export function MapFilterStatus({ dates, tags }: MapFilterStatusProps) {
  return (
    <header
      className="border-b border-border bg-surface px-4 py-3 sm:px-6"
      data-testid="map-filter-status"
    >
      <p className="font-display text-3xl tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        <span data-testid="map-filter-dates">{dates}</span>
      </p>
      {tags ? (
        <p
          className="mt-1 text-sm text-muted sm:text-base"
          data-testid="map-filter-active"
        >
          {tags}
        </p>
      ) : null}
    </header>
  );
}
