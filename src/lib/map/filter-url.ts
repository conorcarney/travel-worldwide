import type { TravelMode } from "@/lib/validations/map-data";
import {
  PLAYBACK_SPEEDS,
  type PlaybackSpeedId,
} from "@/lib/map/journey";
import { parseYearMonth, yearMonthKey, type YearMonth } from "@/lib/map/timeline";
import { clampYearMonth } from "@/lib/map/years";

export type DetailedOverlayVisibility = {
  road: boolean;
  train: boolean;
  ferry: boolean;
};

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
  ferry: false,
  bus: false,
  train: false,
  car: false,
  bookmarks: false,
};

export const DEFAULT_DETAILED_OVERLAYS: DetailedOverlayVisibility = {
  road: true,
  train: true,
  ferry: true,
};

const DETAILED_PARAM_KEYS = ["routes", "trains", "ferries"] as const;
type DetailedParamKey = (typeof DETAILED_PARAM_KEYS)[number];

function isDetailedParamKey(value: string): value is DetailedParamKey {
  return (DETAILED_PARAM_KEYS as readonly string[]).includes(value);
}

/** Straight-line land modes; hidden until the Slow Loading? control is opened. */
export const SLOW_MAP_LAYER_KEYS = [
  "ferry",
  "bus",
  "train",
  "car",
] as const satisfies readonly MapLayerKey[];

export function layerVisibilityParams(layers: LayerVisibility) {
  return {
    hide: MAP_LAYER_KEYS.filter((key) => DEFAULT_LAYERS[key] && !layers[key]),
    show: MAP_LAYER_KEYS.filter((key) => !DEFAULT_LAYERS[key] && layers[key]),
  };
}

function applyLayerVisibilityParams(
  params: URLSearchParams,
  layers: LayerVisibility,
) {
  const { hide, show } = layerVisibilityParams(layers);
  if (hide.length > 0) params.set("hide", hide.join(","));
  if (show.length > 0) params.set("show", show.join(","));
}

export function detailedOverlaysFromSearch(
  search: Pick<URLSearchParams, "get">,
): DetailedOverlayVisibility {
  const raw = search.get("detailed");
  if (raw === null) return { ...DEFAULT_DETAILED_OVERLAYS };
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0 || parts.includes("none")) {
    return { road: false, train: false, ferry: false };
  }
  const keys = new Set(parts.filter(isDetailedParamKey));
  return {
    road: keys.has("routes"),
    train: keys.has("trains"),
    ferry: keys.has("ferries"),
  };
}

function detailedOverlayParam(detailed: DetailedOverlayVisibility): string | null {
  const on: DetailedParamKey[] = [];
  if (detailed.road) on.push("routes");
  if (detailed.train) on.push("trains");
  if (detailed.ferry) on.push("ferries");
  if (
    detailed.road === DEFAULT_DETAILED_OVERLAYS.road &&
    detailed.train === DEFAULT_DETAILED_OVERLAYS.train &&
    detailed.ferry === DEFAULT_DETAILED_OVERLAYS.ferry
  ) {
    return null;
  }
  return on.length === 0 ? "none" : on.join(",");
}

export function applyDetailedOverlayParams(
  params: URLSearchParams,
  detailed: DetailedOverlayVisibility,
) {
  const value = detailedOverlayParam(detailed);
  if (value) params.set("detailed", value);
}

/** Default map zoom when the URL omits `zoom`. */
export const DEFAULT_MAP_ZOOM = 6;

/** Default date-filter start when the URL omits `from`. */
export const DEFAULT_FILTER_START: YearMonth = { year: 2013, month: 1 };

/**
 * Highest zoom restored from the URL on load.
 * Follow-cam used to persist ~9–16 into `zoom=`; those values are treated as
 * unset so production refreshes don't reopen super-zoomed-in.
 */
export const MAX_RESTORED_MAP_ZOOM = 8;

/** Default playback speed when the URL omits `speed`. */
export const DEFAULT_PLAYBACK_SPEED: PlaybackSpeedId = "normal";

/** Initial map zoom from a parsed URL value (drops legacy follow-cam zooms). */
export function resolveInitialMapZoom(urlZoom: number): number {
  if (!Number.isFinite(urlZoom)) return DEFAULT_MAP_ZOOM;
  if (urlZoom > MAX_RESTORED_MAP_ZOOM) return DEFAULT_MAP_ZOOM;
  return Math.min(MAX_RESTORED_MAP_ZOOM, Math.max(1, Math.round(urlZoom)));
}

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

function isPlaybackSpeedId(value: string): value is PlaybackSpeedId {
  return PLAYBACK_SPEEDS.some((speed) => speed.id === value);
}

export function parsePlaybackSpeedParam(
  value: string | null,
): PlaybackSpeedId {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (isPlaybackSpeedId(trimmed)) return trimmed;
  return DEFAULT_PLAYBACK_SPEED;
}

export function parseMapZoomParam(value: string | null): number {
  if (!value) return DEFAULT_MAP_ZOOM;
  const zoom = Number(value);
  if (!Number.isFinite(zoom)) return DEFAULT_MAP_ZOOM;
  return Math.min(18, Math.max(1, Math.round(zoom)));
}

export function parsePausedParam(search: {
  get: (name: string) => string | null;
}): boolean {
  const paused = search.get("paused");
  if (paused === "1" || paused === "true") return true;
  if (paused === "0" || paused === "false") return false;
  const play = search.get("play");
  if (play === "0" || play === "false") return true;
  if (play === "1" || play === "true") return false;
  return false;
}

export function parseShowAllParam(search: {
  get: (name: string) => string | null;
}): boolean {
  const all = search.get("all");
  return all === "1" || all === "true";
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

export type MapFilterSearch = {
  from: YearMonth | null;
  to: YearMonth | null;
  tags: string[];
  layers: LayerVisibility;
  detailed: DetailedOverlayVisibility;
  speed: PlaybackSpeedId;
  zoom: number;
  paused: boolean;
  showAll: boolean;
};

export function parseMapFilterSearch(search: {
  get: (name: string) => string | null;
  getAll?: (name: string) => string[];
}): MapFilterSearch {
  return {
    from: parseYearMonthParam(search.get("from")),
    to: parseYearMonthParam(search.get("to")),
    tags: parseTagParams(search),
    layers: layersFromSearch(search),
    detailed: detailedOverlaysFromSearch(search),
    speed: parsePlaybackSpeedParam(search.get("speed")),
    zoom: parseMapZoomParam(search.get("zoom")),
    paused: parsePausedParam(search),
    showAll: parseShowAllParam(search),
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
  const start = clampYearMonth(from ?? DEFAULT_FILTER_START, min, max);
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
  detailed?: DetailedOverlayVisibility;
  speed?: PlaybackSpeedId;
  zoom?: number;
  paused?: boolean;
  showAll?: boolean;
}): string {
  const params = new URLSearchParams();
  const defaultFrom = clampYearMonth(
    DEFAULT_FILTER_START,
    input.boundsMin,
    input.boundsMax,
  );
  if (yearMonthKey(input.from) !== yearMonthKey(defaultFrom)) {
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

  applyLayerVisibilityParams(params, input.layers);
  applyDetailedOverlayParams(
    params,
    input.detailed ?? DEFAULT_DETAILED_OVERLAYS,
  );

  const speed = input.speed ?? DEFAULT_PLAYBACK_SPEED;
  params.set("speed", speed);

  const zoom = input.zoom ?? DEFAULT_MAP_ZOOM;
  params.set("zoom", String(zoom));

  params.set("paused", input.paused ? "1" : "0");
  if (input.showAll) params.set("all", "1");

  return params.toString();
}

/** Stats → map: first-visit month in the date filter, country as a trip tag. */
export function buildCountryVisitMapHref(country: string, date: string): string {
  const params = new URLSearchParams();
  const month = parseYearMonth(date);
  if (month) {
    params.set("from", formatYearMonthParam(month));
    params.set("to", formatYearMonthParam(month));
  }
  const tag = country.trim();
  if (tag) params.append("tag", tag);
  return `/map?${params.toString()}`;
}

/** Checkbox + overlay state that shows only this travel mode. */
export function isolatedModeVisibility(mode: TravelMode): {
  layers: LayerVisibility;
  detailed: DetailedOverlayVisibility;
} {
  return {
    layers: {
      visited: false,
      flight: mode === "flight",
      ferry: false,
      bus: mode === "bus",
      train: false,
      car: mode === "car",
      bookmarks: false,
    },
    detailed: {
      road: mode === "car" || mode === "bus",
      train: mode === "train",
      ferry: mode === "ferry",
    },
  };
}

/** Stats → map: only this travel mode. Pass a year to limit the date filter. */
export function buildModeMapHref(mode: TravelMode, year?: number): string {
  const { layers, detailed } = isolatedModeVisibility(mode);
  const params = new URLSearchParams();
  if (year !== undefined) {
    params.set("from", formatYearMonthParam({ year, month: 1 }));
    params.set("to", formatYearMonthParam({ year, month: 12 }));
  } else {
    params.set("from", formatYearMonthParam({ year: 1900, month: 1 }));
  }
  applyLayerVisibilityParams(params, layers);
  applyDetailedOverlayParams(params, detailed);
  params.set("all", "1");
  return `/map?${params.toString()}`;
}
