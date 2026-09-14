import {
  detailedOverlayForMode,
} from "@/lib/map/normalize";
import type { TravelMode } from "@/lib/validations/map-data";
import type {
  DetailedOverlayVisibility,
  LayerVisibility,
} from "@/lib/map/filter-url";

export type { DetailedOverlayVisibility } from "@/lib/map/filter-url";

const ROAD_MODES: TravelMode[] = ["car", "bus"];

/** Layer checkbox or matching detailed overlay makes a mode playable/visible. */
export function isModeVisibleOnMap(
  mode: TravelMode,
  layers: LayerVisibility,
  detailed: DetailedOverlayVisibility,
): boolean {
  if (mode === "flight") return layers.flight;
  if (layers[mode]) return true;
  const kind = detailedOverlayForMode(mode);
  if (!kind || !detailed[kind]) return false;
  // A checked sibling (car vs bus) means the overlay is scoped to that checkbox.
  if (kind === "road" && ROAD_MODES.some((sibling) => layers[sibling])) {
    return false;
  }
  return true;
}

/** Walk the trip queue from `start` (inclusive) and return the next playable index. */
export function findPlayableTripIndex(
  queue: readonly string[],
  start: number,
  direction: 1 | -1,
  isPlayable: (routeId: string) => boolean,
): number | null {
  for (let i = start; i >= 0 && i < queue.length; i += direction) {
    const routeId = queue[i];
    if (routeId && isPlayable(routeId)) return i;
  }
  return null;
}
