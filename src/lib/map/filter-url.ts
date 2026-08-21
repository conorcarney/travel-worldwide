import type { TravelMode } from "@/lib/validations/map-data";
import { yearMonthKey, type YearMonth } from "@/lib/map/timeline";
import { clampYearMonth } from "@/lib/map/years";

export type LayerVisibility = {
  visited: boolean;
  bookmarks: boolean;
} & Record<TravelMode, boolean>;

export const MAP_LAYER_KEYS = [
  "visited",
  "flight",
  "ferry",
  "bus",
  "train",
  "car",
  "bookmarks",
] as const satisfies readonly (keyof LayerVisibility)[];

export type MapLayerKey = (typeof MAP_LAYER_KEYS)[number];

export const DEFAULT_LAYERS: LayerVisibility = {
  visited: true,
  flight: true,
  ferry: true,
  bus: true,
  train: true,
  car: true,
  bookmarks: false,
};

export function formatYearMonthParam(value: YearMonth): string {
  return `${value.year}-${String(value.month).padStart(2, "0")}`;
}

export function parseYearMonthParam(value: string | null): YearMonth | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

function isLayerKey(value: string): value is MapLayerKey {
  return (MAP_LAYER_KEYS as readonly string[]).includes(value);
}

export function layersFromSearch(
  search: Pick<URLSearchParams, "get">,
): LayerVisibility {
  const layers = { ...DEFAULT_LAYERS };
  const hide = (search.get("hide") ?? "").split(",");
  const show = (search.get("show") ?? "").split(",");
  for (const part of hide) {
    const key = part.trim();
    if (isLayerKey(key)) layers[key] = false;
  }
  for (const part of show) {
    const key = part.trim();
    if (isLayerKey(key)) layers[key] = true;
  }
  return layers;
}

export function parseMapFilterSearch(search: {
  get: (name: string) => string | null;
  getAll?: (name: string) => string[];
}): {
  from: YearMonth | null;
  to: YearMonth | null;
  tags: string[];
  layers: LayerVisibility;
} {
  return {
    from: parseYearMonthParam(search.get("from")),
    to: parseYearMonthParam(search.get("to")),
    tags: parseTagParams(search),
    layers: layersFromSearch(search),
  };
}

export function parseTagParams(search: {
  get: (name: string) => string | null;
  getAll?: (name: string) => string[];
}): string[] {
  const raw = search.getAll?.("tag") ?? [];
  const values = raw.length > 0 ? raw : [search.get("tag") ?? ""];
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    for (const part of value.split(",")) {
      const tag = part.trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}

export function clampFilterRange(
  from: YearMonth | null,
  to: YearMonth | null,
  min: YearMonth,
  max: YearMonth,
): { start: YearMonth; end: YearMonth } {
  const start = clampYearMonth(from ?? min, min, max);
  const end = clampYearMonth(to ?? max, min, max);
  if (yearMonthKey(start) <= yearMonthKey(end)) {
    return { start, end };
  }
  return { start: end, end: start };
}

export function buildMapFilterQuery(input: {
  from: YearMonth;
  to: YearMonth;
  boundsMin: YearMonth;
  boundsMax: YearMonth;
  tags: string[];
  layers: LayerVisibility;
}): string {
  const params = new URLSearchParams();
  if (yearMonthKey(input.from) !== yearMonthKey(input.boundsMin)) {
    params.set("from", formatYearMonthParam(input.from));
  }
  if (yearMonthKey(input.to) !== yearMonthKey(input.boundsMax)) {
    params.set("to", formatYearMonthParam(input.to));
  }
  const seen = new Set<string>();
  for (const tag of input.tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    params.append("tag", trimmed);
  }

  const hide = MAP_LAYER_KEYS.filter(
    (key) => DEFAULT_LAYERS[key] && !input.layers[key],
  );
  const show = MAP_LAYER_KEYS.filter(
    (key) => !DEFAULT_LAYERS[key] && input.layers[key],
  );
  if (hide.length > 0) params.set("hide", hide.join(","));
  if (show.length > 0) params.set("show", show.join(","));

  return params.toString();
}
