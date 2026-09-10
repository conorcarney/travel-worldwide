import {
  DEFAULT_LAYERS,
  MAP_LAYER_KEYS,
  type LayerVisibility,
} from "@/lib/map/filter-url";

const LAYER_LABELS: Record<keyof LayerVisibility, string> = {
  visited: "Visited countries",
  flight: "Flights",
  ferry: "Ferries",
  bus: "Buses",
  train: "Trains",
  car: "Cars",
  bookmarks: "Bookmarks",
};

export function formatMapFilterStatus(input: {
  rangeLabel: string;
  tags: string[];
  layers: LayerVisibility;
}): { dates: string; filters: string } {
  const parts: string[] = [];
  if (input.tags.length > 0) {
    parts.push(input.tags.join(" · "));
  }
  for (const key of MAP_LAYER_KEYS) {
    if (input.layers[key] === DEFAULT_LAYERS[key]) continue;
    parts.push(
      input.layers[key] ? LAYER_LABELS[key] : `${LAYER_LABELS[key]} off`,
    );
  }
  return {
    dates: input.rangeLabel,
    filters: parts.join(" · "),
  };
}
