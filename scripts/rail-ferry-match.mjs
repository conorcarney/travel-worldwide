/** @typedef {{ lat: number, lng: number }} LatLng */
/** @typedef {LatLng & {
  name?: string,
  railway?: string,
  station?: string,
  usage?: string,
  train?: string,
  subway?: string,
  uic_ref?: string,
}} Station */
/** @typedef {LatLng & {
  name?: string,
  amenity?: string,
  ferry?: string,
  public_transport?: string,
}} FerryTerminal */

import {
  distancePointToPathMeters,
  haversineMeters,
  pathLengthMeters,
} from "./land-route-geometry.mjs";

const SUBWAY_KINDS = new Set(["subway", "light_rail", "monorail", "tram"]);
const GENERIC_PLACE_TOKENS = new Set([
  "ferry",
  "terminal",
  "port",
  "harbour",
  "harbor",
  "pier",
  "quay",
  "wharf",
  "dock",
  "station",
  "island",
  "islands",
  "the",
]);

/**
 * Parse OSM `duration` tags (HH:MM, H:MM:SS, or minutes as a number).
 * @param {unknown} value
 * @returns {number | null} seconds
 */
export function parseOsmDuration(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const clock = text.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (clock) {
    return (
      Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3] ?? 0)
    );
  }
  const numeric = Number(text);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric * 60);
}

/**
 * Prefer named mainline stations over subway stops that happen to be closer.
 * @param {Station} station
 * @param {LatLng} origin
 */
export function stationScore(station, origin) {
  const dist = haversineMeters(origin, station);
  let penalty = 0;
  const kind = (station.station ?? "").toLowerCase();
  const railway = (station.railway ?? "").toLowerCase();
  if (
    SUBWAY_KINDS.has(kind) ||
    railway === "tram_stop" ||
    (station.subway ?? "").toLowerCase() === "yes"
  ) {
    penalty += 8000;
  }
  if (railway === "halt") penalty += 400;
  if (!station.name) penalty += 1500;
  if ((station.usage ?? "").toLowerCase() === "tourism") penalty += 3000;
  if ((station.usage ?? "").toLowerCase() === "main") penalty -= 1500;
  if ((station.train ?? "").toLowerCase() === "yes" || station.uic_ref) {
    penalty -= 1200;
  }
  return dist + penalty;
}

/**
 * @param {Station[]} stations
 * @param {LatLng} origin
 * @returns {Station | null}
 */
export function pickNearestStation(stations, origin) {
  if (stations.length === 0) return null;
  return stations.reduce((best, station) =>
    stationScore(station, origin) < stationScore(best, origin) ? station : best,
  );
}

/**
 * @param {unknown} value
 */
export function normalizePlaceName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * True when two place/terminal names refer to the same location.
 * @param {unknown} left
 * @param {unknown} right
 */
export function namesOverlap(left, right) {
  const a = normalizePlaceName(left);
  const b = normalizePlaceName(right);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const tokens = (text) =>
    text
      .split(" ")
      .filter((token) => token.length >= 4 && !GENERIC_PLACE_TOKENS.has(token));
  const aTokens = tokens(a);
  const bTokens = tokens(b);
  return aTokens.some((token) =>
    bTokens.some((other) => token.includes(other) || other.includes(token)),
  );
}

/**
 * Prefer a named ferry terminal over a closer unnamed pier.
 * @param {FerryTerminal} terminal
 * @param {LatLng} origin
 * @param {string} [placeName]
 */
export function ferryTerminalScore(terminal, origin, placeName = "") {
  const dist = haversineMeters(origin, terminal);
  let penalty = 0;
  const amenity = (terminal.amenity ?? "").toLowerCase();
  const publicTransport = (terminal.public_transport ?? "").toLowerCase();
  if (amenity === "ferry_terminal") penalty -= 2500;
  if ((terminal.ferry ?? "").toLowerCase() === "yes") penalty -= 400;
  if (publicTransport === "station") penalty -= 800;
  if (publicTransport === "stop_position") penalty -= 200;
  if (!terminal.name) penalty += 1800;
  const name = (terminal.name ?? "").toLowerCase();
  if (/pi[eé]ton|pedestrian|foot passenger|\bcruise\b|\bposte\b/.test(name)) {
    penalty += 2500;
  }
  if (/\bferry\b|\bdocks\b/.test(name)) penalty -= 900;
  if (placeName && namesOverlap(placeName, terminal.name ?? "")) penalty -= 6000;
  return dist + penalty;
}

/**
 * @param {FerryTerminal[]} terminals
 * @param {LatLng} origin
 * @param {string} [placeName]
 * @returns {FerryTerminal | null}
 */
export function pickNearestFerryTerminal(terminals, origin, placeName = "") {
  if (terminals.length === 0) return null;
  return terminals.reduce((best, terminal) =>
    ferryTerminalScore(terminal, origin, placeName) <
    ferryTerminalScore(best, origin, placeName)
      ? terminal
      : best,
  );
}

/**
 * Join way fragments that share (or nearly share) endpoints into one line.
 * @param {LatLng[][]} parts
 * @param {number} [joinMeters]
 */
export function stitchPolylines(parts, joinMeters = 2000) {
  const remaining = parts
    .filter((part) => Array.isArray(part) && part.length >= 2)
    .map((part) => part.slice());
  if (remaining.length === 0) return [];
  remaining.sort((a, b) => b.length - a.length);
  /** @type {LatLng[]} */
  let path = remaining.shift() ?? [];
  let changed = true;
  while (remaining.length > 0 && changed) {
    changed = false;
    const start = path[0];
    const end = path[path.length - 1];
    for (let i = 0; i < remaining.length; i += 1) {
      const part = remaining[i];
      const partStart = part[0];
      const partEnd = part[part.length - 1];
      /** @type {{ build: () => LatLng[] } | null} */
      let join = null;
      let best = joinMeters;
      const consider = (meters, build) => {
        if (meters <= best) {
          best = meters;
          join = { build };
        }
      };
      consider(haversineMeters(end, partStart), () =>
        path.concat(part.slice(1)),
      );
      consider(haversineMeters(end, partEnd), () =>
        path.concat(part.slice(0, -1).reverse()),
      );
      consider(haversineMeters(start, partEnd), () =>
        part.slice(0, -1).concat(path),
      );
      consider(haversineMeters(start, partStart), () =>
        part.slice().reverse().slice(0, -1).concat(path),
      );
      if (join) {
        path = join.build();
        remaining.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return path;
}

/**
 * @param {LatLng[]} path
 * @param {LatLng} from
 * @param {LatLng} to
 */
export function orientPath(path, from, to) {
  if (path.length < 2) return path.slice();
  const first = path[0];
  const last = path[path.length - 1];
  const forward = haversineMeters(from, first) + haversineMeters(to, last);
  const backward = haversineMeters(from, last) + haversineMeters(to, first);
  return backward < forward ? path.slice().reverse() : path.slice();
}

/**
 * Keep the section of a path between the vertices nearest `from` and `to`.
 * @param {LatLng[]} path
 * @param {LatLng} from
 * @param {LatLng} to
 */
export function slicePathBetween(path, from, to) {
  if (path.length < 2) return path.slice();
  let fromIndex = 0;
  let toIndex = 0;
  let fromDist = Number.POSITIVE_INFINITY;
  let toDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < path.length; i += 1) {
    const dFrom = haversineMeters(from, path[i]);
    const dTo = haversineMeters(to, path[i]);
    if (dFrom < fromDist) {
      fromDist = dFrom;
      fromIndex = i;
    }
    if (dTo < toDist) {
      toDist = dTo;
      toIndex = i;
    }
  }
  if (fromIndex === toIndex) {
    const lo = Math.max(0, fromIndex - 1);
    const hi = Math.min(path.length - 1, fromIndex + 1);
    return path.slice(lo, hi + 1);
  }
  if (fromIndex < toIndex) return path.slice(fromIndex, toIndex + 1);
  return path.slice(toIndex, fromIndex + 1).reverse();
}

/**
 * If both endpoints snapped to the same pier, match the OSM way against the
 * original trip coordinates instead of the collapsed terminals.
 * @param {LatLng} from
 * @param {LatLng} to
 * @param {LatLng} fromTerminal
 * @param {LatLng} toTerminal
 */
export function ferryMatchEnds(from, to, fromTerminal, toTerminal) {
  const tripSpan = haversineMeters(from, to);
  const terminalSpan = haversineMeters(fromTerminal, toTerminal);
  if (tripSpan > 8_000 && terminalSpan < Math.max(1_000, tripSpan * 0.25)) {
    return { from, to, collapsed: true };
  }
  return { from: fromTerminal, to: toTerminal, collapsed: false };
}

/**
 * @param {{ path: LatLng[], duration?: number | null, name?: string, from?: string, to?: string }[]} candidates
 * @param {LatLng} from
 * @param {LatLng} to
 * @param {number} maxSnapMeters
 * @param {{ from?: string, to?: string }} [placeNames]
 */
export function pickFerryRoute(
  candidates,
  from,
  to,
  maxSnapMeters,
  placeNames = {},
) {
  /** @type {{ path: LatLng[], duration: number | null, name: string, score: number } | null} */
  let best = null;
  const fromName = placeNames.from ?? "";
  const toName = placeNames.to ?? "";
  for (const candidate of candidates) {
    if (!candidate.path || candidate.path.length < 2) continue;
    const haystack = `${candidate.name ?? ""} ${candidate.from ?? ""} ${candidate.to ?? ""}`;
    const namedFrom = fromName ? namesOverlap(fromName, haystack) : false;
    const namedTo = toName ? namesOverlap(toName, haystack) : false;
    let snapLimit = maxSnapMeters;
    if (namedFrom || namedTo) snapLimit *= 4;
    if (namedFrom && namedTo) snapLimit *= 2;
    const dFrom = distancePointToPathMeters(from, candidate.path);
    const dTo = distancePointToPathMeters(to, candidate.path);
    if (dFrom > snapLimit || dTo > snapLimit) continue;
    const sliced = slicePathBetween(
      orientPath(candidate.path, from, to),
      from,
      to,
    );
    if (sliced.length < 2) continue;
    const expected = haversineMeters(from, to);
    const length = pathLengthMeters(sliced);
    if (expected > 8_000 && length < expected * 0.4) continue;
    if (expected > 8_000 && length > expected * 6) continue;
    const score =
      dFrom + dTo - (namedFrom ? 40_000 : 0) - (namedTo ? 40_000 : 0);
    if (!best || score < best.score) {
      best = {
        path: sliced,
        duration: candidate.duration ?? null,
        name: candidate.name ?? "",
        score,
      };
    }
  }
  return best;
}
