import { haversineKm } from "@/lib/map/distance";
import {
  distancePointToPathMeters,
  pathLengthMeters,
} from "@/lib/map/simplify-path";

export type LatLng = { lat: number; lng: number };

export type Station = LatLng & {
  name?: string;
  railway?: string;
  station?: string;
  usage?: string;
  train?: string;
  subway?: string;
  uic_ref?: string;
};

export type FerryTerminal = LatLng & {
  name?: string;
  amenity?: string;
  ferry?: string;
  public_transport?: string;
};

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

function haversineMeters(from: LatLng, to: LatLng) {
  return haversineKm([from.lat, from.lng], [to.lat, to.lng]) * 1000;
}

/** Parse OSM `duration` tags (HH:MM, H:MM:SS, or minutes as a number). */
export function parseOsmDuration(value: unknown): number | null {
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

export function stationScore(station: Station, origin: LatLng) {
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

export function pickNearestStation(
  stations: Station[],
  origin: LatLng,
): Station | null {
  if (stations.length === 0) return null;
  return stations.reduce((best, station) =>
    stationScore(station, origin) < stationScore(best, origin) ? station : best,
  );
}

export function normalizePlaceName(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function namesOverlap(left: unknown, right: unknown) {
  const a = normalizePlaceName(left);
  const b = normalizePlaceName(right);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const tokens = (text: string) =>
    text
      .split(" ")
      .filter((token) => token.length >= 4 && !GENERIC_PLACE_TOKENS.has(token));
  const aTokens = tokens(a);
  const bTokens = tokens(b);
  return aTokens.some((token) =>
    bTokens.some((other) => token.includes(other) || other.includes(token)),
  );
}

export function ferryTerminalScore(
  terminal: FerryTerminal,
  origin: LatLng,
  placeName = "",
) {
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

export function pickNearestFerryTerminal(
  terminals: FerryTerminal[],
  origin: LatLng,
  placeName = "",
): FerryTerminal | null {
  if (terminals.length === 0) return null;
  return terminals.reduce((best, terminal) =>
    ferryTerminalScore(terminal, origin, placeName) <
    ferryTerminalScore(best, origin, placeName)
      ? terminal
      : best,
  );
}

export function stitchPolylines(parts: LatLng[][], joinMeters = 2000): LatLng[] {
  const remaining = parts
    .filter((part) => Array.isArray(part) && part.length >= 2)
    .map((part) => part.slice());
  if (remaining.length === 0) return [];
  remaining.sort((a, b) => b.length - a.length);
  let path = remaining.shift() ?? [];
  let changed = true;
  while (remaining.length > 0 && changed) {
    changed = false;
    const start = path[0]!;
    const end = path[path.length - 1]!;
    for (let i = 0; i < remaining.length; i += 1) {
      const part = remaining[i]!;
      const partStart = part[0]!;
      const partEnd = part[part.length - 1]!;
      const joinState: { build: (() => LatLng[]) | null } = { build: null };
      let best = joinMeters;
      const consider = (meters: number, build: () => LatLng[]) => {
        if (meters <= best) {
          best = meters;
          joinState.build = build;
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
      if (joinState.build) {
        path = joinState.build();
        remaining.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return path;
}

export function orientPath(path: LatLng[], from: LatLng, to: LatLng) {
  if (path.length < 2) return path.slice();
  const first = path[0]!;
  const last = path[path.length - 1]!;
  const forward = haversineMeters(from, first) + haversineMeters(to, last);
  const backward = haversineMeters(from, last) + haversineMeters(to, first);
  return backward < forward ? path.slice().reverse() : path.slice();
}

export function slicePathBetween(path: LatLng[], from: LatLng, to: LatLng) {
  if (path.length < 2) return path.slice();
  let fromIndex = 0;
  let toIndex = 0;
  let fromDist = Number.POSITIVE_INFINITY;
  let toDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < path.length; i += 1) {
    const dFrom = haversineMeters(from, path[i]!);
    const dTo = haversineMeters(to, path[i]!);
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

export function ferryMatchEnds(
  from: LatLng,
  to: LatLng,
  fromTerminal: LatLng,
  toTerminal: LatLng,
) {
  const tripSpan = haversineMeters(from, to);
  const terminalSpan = haversineMeters(fromTerminal, toTerminal);
  if (tripSpan > 8_000 && terminalSpan < Math.max(1_000, tripSpan * 0.25)) {
    return { from, to, collapsed: true };
  }
  return { from: fromTerminal, to: toTerminal, collapsed: false };
}

export function pickFerryRoute(
  candidates: {
    path: LatLng[];
    duration?: number | null;
    name?: string;
    from?: string;
    to?: string;
  }[],
  from: LatLng,
  to: LatLng,
  maxSnapMeters: number,
  placeNames: { from?: string; to?: string } = {},
): { path: LatLng[]; duration: number | null; name: string } | null {
  let best: {
    path: LatLng[];
    duration: number | null;
    name: string;
    score: number;
  } | null = null;
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
