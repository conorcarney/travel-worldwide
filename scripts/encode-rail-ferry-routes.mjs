/**
 * Batch-encode train and ferry land routes into MongoDB `LandRoutes`.
 *
 * Trains: snap each endpoint to the nearest OSM/OpenRailwayMap station or halt,
 * then route station-to-station on the railway graph (OpenRailRouting).
 * Ferries: snap each endpoint to the nearest OSM ferry terminal, then match
 * OSM `route=ferry` ways/relations near both terminals. If no OSM/OpenRail
 * path is found, the existing departure→arrival line is stored instead.
 *
 * Geometry is simplified (Douglas-Peucker) and stored as a Google polyline:
 *
 *   { _id, departure, arrival, date, tags, type,
 *     fromTerminal, toTerminal,
 *     route: { geometry, distance, duration } }
 *
 * Usage (from the repo root):
 *   npm run encode-rail-ferry-routes
 *   npm run encode-rail-ferry-routes -- --dry-run --limit 5
 *
 * This script is not imported by the Next.js app.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { MongoClient, ObjectId } from "mongodb";
import {
  encodePolyline,
  pathLengthMeters,
  simplifyDouglasPeucker,
} from "./land-route-geometry.mjs";
import {
  parseOsmDuration,
  pickFerryRoute,
  pickNearestFerryTerminal,
  pickNearestStation,
  stitchPolylines,
  ferryMatchEnds,
} from "./rail-ferry-match.mjs";

const { loadEnvConfig } = nextEnv;

const SOURCE_COLLECTION = "BusesTrainsAndFerries";
const TARGET_COLLECTION = "LandRoutes";
const DEFAULT_TYPES = ["Train", "Ferry"];
const DEFAULT_OPENRAIL_URL = "https://routing.openrailrouting.org";
const DEFAULT_OPENRAIL_PROFILE = "all_tracks";
const DEFAULT_OVERPASS_URLS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
const DEFAULT_DELAY_MS = 1200;
const DEFAULT_EPSILON_M = 30;
const DEFAULT_FERRY_SNAP_M = 25_000;
const DEFAULT_FERRY_SPEED_KMH = 25;
const DEFAULT_TRAIN_SPEED_KMH = 80;
const REQUEST_TIMEOUT_MS = 60_000;
const REQUEST_RETRIES = 4;
const STATION_RADII_M = [1500, 5000, 15000, 40000];
const FERRY_TERMINAL_RADII_M = [8000, 25000, 80000];
const USER_AGENT = "ahbegrand-encode-rail-ferry";

function printHelp() {
  console.log(`Encode train and ferry routes into MongoDB ${TARGET_COLLECTION}.

Usage:
  node scripts/encode-rail-ferry-routes.mjs [options]

Trains snap to the nearest railway station/halt (OSM / OpenRailwayMap tags)
and route on OpenRailRouting. Ferries snap to the nearest ferry terminal
and match OSM route=ferry ways near both terminals.
If no path is found, the existing departure→arrival line is stored.

Options:
  --dry-run          Route and log without writing (skips existing unless --force)
  --force            Re-route documents that already exist in ${TARGET_COLLECTION}
  --limit <n>        Process at most n source routes
  --delay-ms <n>     Pause between remote requests (default ${DEFAULT_DELAY_MS})
  --epsilon-m <n>    Douglas-Peucker tolerance in metres (default ${DEFAULT_EPSILON_M})
  --types <list>     Comma-separated source types (default ${DEFAULT_TYPES.join(",")})
  --id <hex>         Only process this BusesTrainsAndFerries _id
  -h, --help         Show this help

Environment:
  ATLAS_URI or MONGODB_URI   Mongo connection string (.env.local is loaded)
  MONGODB_DB                 Database name (default Countries)
  OPENRAIL_URL               OpenRailRouting base URL
  OPENRAIL_PROFILE           GraphHopper profile (default ${DEFAULT_OPENRAIL_PROFILE})
  OVERPASS_URL               Overpass interpreter URL (tried first; other
                             public mirrors are used as fallback)
`);
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {{
    dryRun: boolean,
    force: boolean,
    help: boolean,
    limit: number | null,
    delayMs: number,
    epsilonM: number,
    types: string[],
    id: string | null,
  }} */
  const options = {
    dryRun: false,
    force: false,
    help: false,
    limit: null,
    delayMs: DEFAULT_DELAY_MS,
    epsilonM: DEFAULT_EPSILON_M,
    types: [...DEFAULT_TYPES],
    id: null,
  };

  const takeValue = (flag, inline, rest, index) => {
    const value = inline !== undefined ? inline : rest[index];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }
    return {
      value,
      consumed: inline !== undefined ? 0 : 1,
    };
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") continue;
    const eq = arg.indexOf("=");
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    const inline = eq === -1 ? undefined : arg.slice(eq + 1);

    switch (flag) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--force":
        options.force = true;
        break;
      case "--limit": {
        const { value, consumed } = takeValue(flag, inline, argv, i + 1);
        options.limit = Number(value);
        i += consumed;
        break;
      }
      case "--delay-ms": {
        const { value, consumed } = takeValue(flag, inline, argv, i + 1);
        options.delayMs = Number(value);
        i += consumed;
        break;
      }
      case "--epsilon-m": {
        const { value, consumed } = takeValue(flag, inline, argv, i + 1);
        options.epsilonM = Number(value);
        i += consumed;
        break;
      }
      case "--types": {
        const { value, consumed } = takeValue(flag, inline, argv, i + 1);
        options.types = value
          .split(",")
          .map((type) => type.trim())
          .filter(Boolean);
        i += consumed;
        break;
      }
      case "--id": {
        const { value, consumed } = takeValue(flag, inline, argv, i + 1);
        options.id = value.trim();
        i += consumed;
        break;
      }
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (
    options.limit !== null &&
    (!Number.isFinite(options.limit) || options.limit <= 0)
  ) {
    throw new Error("--limit must be a positive number");
  }
  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) {
    throw new Error("--delay-ms must be a number >= 0");
  }
  if (!Number.isFinite(options.epsilonM) || options.epsilonM < 0) {
    throw new Error("--epsilon-m must be a number >= 0");
  }
  if (options.types.length === 0) {
    throw new Error("--types must list at least one type");
  }
  if (options.id && !ObjectId.isValid(options.id)) {
    throw new Error("--id must be a valid ObjectId");
  }

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function asFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * @param {Record<string, unknown>} doc
 * @returns {{ lat: number, lng: number } | null}
 */
function readPoint(doc, latKey, lngKey) {
  const lat = asFiniteNumber(doc[latKey]);
  const lng = asFiniteNumber(doc[lngKey]);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function describeRoute(doc) {
  const from = typeof doc.departure === "string" ? doc.departure : "?";
  const to = typeof doc.arrival === "string" ? doc.arrival : "?";
  const type = typeof doc.type === "string" ? doc.type : "?";
  return `${type} ${from} → ${to}`;
}

function cacheKey(from, to) {
  return `${from.lng.toFixed(5)},${from.lat.toFixed(5)};${to.lng.toFixed(5)},${to.lat.toFixed(5)}`;
}

function stationCacheKey(point) {
  return `${point.lng.toFixed(4)},${point.lat.toFixed(4)}`;
}

function errorMessage(error) {
  if (!(error instanceof Error)) return String(error);
  const cause =
    "cause" in error && error.cause instanceof Error ? error.cause.message : "";
  return cause ? `${error.message} (${cause})` : error.message;
}

function overpassUrlList(env) {
  const configured = typeof env.OVERPASS_URL === "string" ? env.OVERPASS_URL.trim() : "";
  const urls = [];
  if (configured) urls.push(configured);
  for (const url of DEFAULT_OVERPASS_URLS) {
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

function paddedBbox(from, to, padDeg) {
  return {
    south: Math.max(-90, Math.min(from.lat, to.lat) - padDeg),
    north: Math.min(90, Math.max(from.lat, to.lat) + padDeg),
    west: Math.min(from.lng, to.lng) - padDeg,
    east: Math.max(from.lng, to.lng) + padDeg,
  };
}

function elementPoint(el) {
  const lat = asFiniteNumber(el?.lat ?? el?.center?.lat);
  const lng = asFiniteNumber(el?.lon ?? el?.lng ?? el?.center?.lon);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function geometryFromOverpass(geometry) {
  if (!Array.isArray(geometry)) return [];
  /** @type {{ lat: number, lng: number }[]} */
  const path = [];
  for (const node of geometry) {
    const lat = asFiniteNumber(node?.lat);
    const lng = asFiniteNumber(node?.lon ?? node?.lng);
    if (lat === null || lng === null) continue;
    path.push({ lat, lng });
  }
  return path;
}

function coordinatesFromGeoJson(geometry) {
  if (
    !geometry ||
    typeof geometry !== "object" ||
    !("coordinates" in geometry) ||
    !Array.isArray(geometry.coordinates)
  ) {
    throw new Error("Route geometry is missing LineString coordinates");
  }
  return geometry.coordinates.map((pair, index) => {
    if (!Array.isArray(pair) || pair.length < 2) {
      throw new Error(`Coordinate ${index} is invalid`);
    }
    const lng = asFiniteNumber(pair[0]);
    const lat = asFiniteNumber(pair[1]);
    if (lat === null || lng === null) {
      throw new Error(`Coordinate ${index} is not numeric`);
    }
    return { lat, lng };
  });
}

function encodedRoute(points, distance, duration, epsilonM) {
  const simplified = simplifyDouglasPeucker(points, epsilonM);
  return {
    geometry: encodePolyline(simplified),
    distance: Math.round(distance),
    duration: Math.round(duration),
    inputPoints: points.length,
    outputPoints: simplified.length,
  };
}

function durationFromFerry(path, taggedSeconds) {
  if (taggedSeconds != null && taggedSeconds > 0) return taggedSeconds;
  const meters = pathLengthMeters(path);
  return Math.round((meters / 1000 / DEFAULT_FERRY_SPEED_KMH) * 3600);
}

function durationFromExisting(path, type) {
  const kmh = type === "Ferry" ? DEFAULT_FERRY_SPEED_KMH : DEFAULT_TRAIN_SPEED_KMH;
  const meters = pathLengthMeters(path);
  return Math.round((meters / 1000 / kmh) * 3600);
}

/**
 * Straight line already shown on the map when OSM/OpenRailRouting finds nothing.
 * @param {{ lat: number, lng: number }} from
 * @param {{ lat: number, lng: number }} to
 * @param {string} type
 * @param {string} fromName
 * @param {string} toName
 */
function encodedExistingRoute(from, to, type, fromName, toName) {
  const points = [from, to];
  const distance = pathLengthMeters(points);
  return {
    ...encodedRoute(points, distance, durationFromExisting(points, type), 0),
    detail: `existing route ${fromName || "departure"} → ${toName || "arrival"}`,
    ...(type === "Ferry"
      ? {
          fromTerminal: { lat: from.lat, lng: from.lng, name: fromName },
          toTerminal: { lat: to.lat, lng: to.lng, name: toName },
        }
      : {}),
  };
}

/**
 * @param {string} url
 * @param {RequestInit} init
 */
async function fetchJson(url, init) {
  let lastError = new Error("Request failed");
  for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status} ${url}`);
        await sleep(DEFAULT_DELAY_MS * 2 ** attempt);
        continue;
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message)
            : `HTTP ${response.status}`;
        throw new Error(message.split("\n")[0] ?? message);
      }
      return payload;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable =
        lastError.name === "TimeoutError" ||
        lastError.message.startsWith("HTTP 429") ||
        lastError.message.startsWith("HTTP 5");
      if (attempt < REQUEST_RETRIES && retryable) {
        await sleep(DEFAULT_DELAY_MS * 2 ** attempt);
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

function isRetryableOverpassError(error) {
  const message = errorMessage(error);
  return (
    message.includes("fetch failed") ||
    message.includes("Timeout") ||
    message.includes("Connect Timeout") ||
    message.startsWith("HTTP 429") ||
    message.startsWith("HTTP 5")
  );
}

function createLimiter(delayMs) {
  let chain = Promise.resolve();
  let first = true;
  return async function gated(fn) {
    const run = chain.then(async () => {
      if (!first && delayMs > 0) await sleep(delayMs);
      first = false;
      return fn();
    });
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}

function createClients(env, delayMs) {
  const overpassUrls = overpassUrlList(env);
  const openrailUrl = (env.OPENRAIL_URL ?? DEFAULT_OPENRAIL_URL).replace(
    /\/+$/,
    "",
  );
  const profile = env.OPENRAIL_PROFILE ?? DEFAULT_OPENRAIL_PROFILE;
  const gate = createLimiter(delayMs);
  const stationCache = new Map();
  const terminalCache = new Map();
  const ferryCache = new Map();

  async function overpass(query) {
    return gate(async () => {
      let lastError = new Error("Overpass request failed");
      for (const url of overpassUrls) {
        try {
          return await fetchJson(url, {
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body: new URLSearchParams({ data: query }),
          });
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (!isRetryableOverpassError(lastError)) throw lastError;
        }
      }
      throw lastError;
    });
  }

  async function nearestStation(point) {
    const key = stationCacheKey(point);
    if (stationCache.has(key)) return stationCache.get(key);

    for (const radius of STATION_RADII_M) {
      const query = `[out:json][timeout:25];
(
  node["railway"="station"](around:${radius},${point.lat},${point.lng});
  node["railway"="halt"](around:${radius},${point.lat},${point.lng});
);
out body;`;
      const payload = await overpass(query);
      const stations = (payload.elements ?? [])
        .filter((el) => el.type === "node")
        .map((el) => ({
          lat: el.lat,
          lng: el.lon,
          name: el.tags?.name,
          railway: el.tags?.railway,
          station: el.tags?.station,
          usage: el.tags?.usage,
          train: el.tags?.train,
          subway: el.tags?.subway,
          uic_ref: el.tags?.uic_ref,
        }))
        .filter((el) => Number.isFinite(el.lat) && Number.isFinite(el.lng));
      const picked = pickNearestStation(stations, point);
      if (picked) {
        stationCache.set(key, picked);
        return picked;
      }
    }
    throw new Error("No nearby railway station/halt");
  }

  async function routeRail(from, to) {
    const url = new URL(`${openrailUrl}/route`);
    url.searchParams.append("point", `${from.lat},${from.lng}`);
    url.searchParams.append("point", `${to.lat},${to.lng}`);
    url.searchParams.set("profile", profile);
    url.searchParams.set("points_encoded", "false");
    url.searchParams.set("instructions", "false");
    url.searchParams.set("calc_points", "true");

    const payload = await gate(() => fetchJson(url.toString(), { method: "GET" }));
    const route = payload?.paths?.[0];
    if (!route) throw new Error("OpenRailRouting returned no path");
    const points = coordinatesFromGeoJson(route.points);
    if (points.length < 2) throw new Error("OpenRailRouting path is too short");
    return {
      points,
      distance: Number(route.distance) || pathLengthMeters(points),
      duration: Math.round((Number(route.time) || 0) / 1000),
    };
  }

  function parseFerryElements(payload) {
    /** @type {{ path: { lat: number, lng: number }[], duration: number | null, name: string, from: string, to: string }[]} */
    const candidates = [];
    for (const el of payload.elements ?? []) {
      const name = el.tags?.name ?? "";
      const fromName = el.tags?.from ?? "";
      const toName = el.tags?.to ?? "";
      const duration = parseOsmDuration(el.tags?.duration);
      if (el.type === "way") {
        candidates.push({
          path: geometryFromOverpass(el.geometry),
          duration,
          name,
          from: fromName,
          to: toName,
        });
        continue;
      }
      if (el.type === "relation" && Array.isArray(el.members)) {
        const parts = el.members
          .map((member) => geometryFromOverpass(member.geometry))
          .filter((part) => part.length >= 2);
        const path = stitchPolylines(parts);
        if (path.length >= 2) {
          candidates.push({
            path,
            duration,
            name,
            from: fromName,
            to: toName,
          });
        }
      }
    }
    return candidates;
  }

  async function nearestFerryTerminal(point, placeName = "") {
    const key = `${stationCacheKey(point)}|${placeName}`;
    if (terminalCache.has(key)) return terminalCache.get(key);

    for (const radius of FERRY_TERMINAL_RADII_M) {
      const query = `[out:json][timeout:25];
(
  node["amenity"="ferry_terminal"](around:${radius},${point.lat},${point.lng});
  way["amenity"="ferry_terminal"](around:${radius},${point.lat},${point.lng});
  relation["amenity"="ferry_terminal"](around:${radius},${point.lat},${point.lng});
  node["public_transport"="station"]["ferry"="yes"](around:${radius},${point.lat},${point.lng});
  node["public_transport"="stop_position"]["ferry"="yes"](around:${radius},${point.lat},${point.lng});
);
out center;`;
      const payload = await overpass(query);
      const terminals = (payload.elements ?? [])
        .map((el) => {
          const pointOnEl = elementPoint(el);
          if (!pointOnEl) return null;
          return {
            ...pointOnEl,
            name: el.tags?.name ?? el.tags?.["name:en"] ?? "",
            amenity: el.tags?.amenity,
            ferry: el.tags?.ferry,
            public_transport: el.tags?.public_transport,
          };
        })
        .filter(Boolean);
      if (terminals.length === 0) continue;
      const picked = pickNearestFerryTerminal(terminals, point, placeName);
      if (picked) {
        terminalCache.set(key, picked);
        return picked;
      }
    }
    terminalCache.set(key, null);
    return null;
  }

  async function fetchFerryAround(points) {
    const arounds = points.map(
      (point) =>
        `  way["route"="ferry"](around:${DEFAULT_FERRY_SNAP_M},${point.lat},${point.lng});
  relation["route"="ferry"](around:${DEFAULT_FERRY_SNAP_M},${point.lat},${point.lng});`,
    );
    const aroundQuery = `[out:json][timeout:45];
(
${arounds.join("\n")}
);
out geom;`;
    return parseFerryElements(await overpass(aroundQuery));
  }

  async function fetchFerryBbox(bbox) {
    const bboxQuery = `[out:json][timeout:45];
(
  way["route"="ferry"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  relation["route"="ferry"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out geom;`;
    return parseFerryElements(await overpass(bboxQuery));
  }

  async function routeFerry(from, to, fromName = "", toName = "") {
    const key = `${cacheKey(from, to)}|${fromName}|${toName}`;
    if (ferryCache.has(key)) return ferryCache.get(key);

    const fromTerminal =
      (await nearestFerryTerminal(from, fromName)) ?? {
        ...from,
        name: fromName,
      };
    const toTerminal =
      (await nearestFerryTerminal(to, toName)) ?? { ...to, name: toName };

    const matchEnds = ferryMatchEnds(from, to, fromTerminal, toTerminal);
    const placeNames = { from: fromName, to: toName };
    const pickFrom = (candidates) =>
      pickFerryRoute(
        candidates,
        matchEnds.from,
        matchEnds.to,
        DEFAULT_FERRY_SNAP_M,
        placeNames,
      ) ??
      pickFerryRoute(candidates, from, to, DEFAULT_FERRY_SNAP_M, placeNames);

    const aroundPoints = matchEnds.collapsed
      ? [from, to, fromTerminal, toTerminal]
      : [fromTerminal, toTerminal];
    let candidates = await fetchFerryAround(aroundPoints);
    let picked = pickFrom(candidates);
    if (!picked || picked.path.length < 2) {
      candidates = await fetchFerryBbox(paddedBbox(from, to, 0.4));
      picked = pickFrom(candidates);
    }
    if (!picked || picked.path.length < 2) {
      throw new Error("No OSM ferry way near both terminals");
    }
    const result = {
      points: picked.path,
      distance: pathLengthMeters(picked.path),
      duration: durationFromFerry(picked.path, picked.duration),
      name: picked.name,
      fromTerminal,
      toTerminal,
    };
    ferryCache.set(key, result);
    return result;
  }

  return { nearestStation, routeRail, routeFerry };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

  const mongoUri = process.env.ATLAS_URI ?? process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("ATLAS_URI or MONGODB_URI is not set");
  }

  const dbName = process.env.MONGODB_DB ?? "Countries";
  const clients = createClients(process.env, options.delayMs);
  const railCache = new Map();

  const client = new MongoClient(mongoUri);
  await client.connect();

  const source = client.db(dbName).collection(SOURCE_COLLECTION);
  const target = client.db(dbName).collection(TARGET_COLLECTION);

  /** @type {Record<string, unknown>} */
  const filter = { type: { $in: options.types } };
  if (options.id) {
    filter._id = new ObjectId(options.id);
  }

  const cursor = source.find(filter);
  const existingIds = options.force
    ? new Set()
    : new Set(
        (await target.find({}, { projection: { _id: 1 } }).toArray()).map((doc) =>
          String(doc._id),
        ),
      );

  let seen = 0;
  let routed = 0;
  let written = 0;
  let skipped = 0;
  let failed = 0;

  try {
    console.log(
      `Source ${SOURCE_COLLECTION} types=${options.types.join(",")} → ${TARGET_COLLECTION}` +
        (options.dryRun ? " (dry-run)" : ""),
    );

    for await (const doc of cursor) {
      if (options.limit !== null && seen >= options.limit) break;
      seen += 1;

      const id = doc._id;
      const type = readText(doc.type);
      const label = `[${seen}] ${describeRoute(doc)}`;
      const date = readText(doc.date);
      const tags = readText(doc.tags);

      if (!options.force && existingIds.has(String(id))) {
        if (!options.dryRun) {
          await target.updateOne({ _id: id }, { $set: { date, tags, type } });
        }
        skipped += 1;
        console.log(`${label}: skip existing (date/tags updated)`);
        continue;
      }

      const departure = readPoint(doc, "departure_latitude", "departure_longitude");
      const arrival = readPoint(doc, "arrival_latitude", "arrival_longitude");
      if (!departure || !arrival) {
        failed += 1;
        console.error(`${label}: invalid coordinates`);
        continue;
      }

      const fromName = readText(doc.departure);
      const toName = readText(doc.arrival);
      let routedPath;

      try {
        if (type === "Train") {
          const fromStation = await clients.nearestStation(departure);
          const toStation = await clients.nearestStation(arrival);
          const key = cacheKey(fromStation, toStation);
          routedPath = railCache.get(key);
          if (!routedPath) {
            const rail = await clients.routeRail(fromStation, toStation);
            routedPath = {
              ...encodedRoute(
                rail.points,
                rail.distance,
                rail.duration,
                options.epsilonM,
              ),
              detail: `${fromStation.name ?? "station"} → ${toStation.name ?? "station"}`,
            };
            railCache.set(key, routedPath);
          }
        } else if (type === "Ferry") {
          const ferry = await clients.routeFerry(
            departure,
            arrival,
            fromName,
            toName,
          );
          const fromTerminalName =
            ferry.fromTerminal?.name?.trim() || fromName || "terminal";
          const toTerminalName =
            ferry.toTerminal?.name?.trim() || toName || "terminal";
          routedPath = {
            ...encodedRoute(
              ferry.points,
              ferry.distance,
              ferry.duration,
              options.epsilonM,
            ),
            detail: `${fromTerminalName} → ${toTerminalName}${
              ferry.name ? ` (${ferry.name})` : ""
            }`,
            fromTerminal: {
              lat: ferry.fromTerminal.lat,
              lng: ferry.fromTerminal.lng,
              name: fromTerminalName,
            },
            toTerminal: {
              lat: ferry.toTerminal.lat,
              lng: ferry.toTerminal.lng,
              name: toTerminalName,
            },
          };
        } else {
          throw new Error(`Unsupported type ${type || "(empty)"}`);
        }
      } catch (error) {
        if (type !== "Train" && type !== "Ferry") {
          failed += 1;
          console.error(`${label}: ${errorMessage(error)}`);
          continue;
        }
        console.warn(
          `${label}: ${errorMessage(error)}; using existing route`,
        );
        routedPath = encodedExistingRoute(
          departure,
          arrival,
          type,
          fromName,
          toName,
        );
      }

      routed += 1;
      const document = {
        _id: id,
        departure,
        arrival,
        date,
        tags,
        type,
        route: {
          geometry: routedPath.geometry,
          distance: routedPath.distance,
          duration: routedPath.duration,
        },
        ...(routedPath.fromTerminal
          ? { fromTerminal: routedPath.fromTerminal }
          : {}),
        ...(routedPath.toTerminal
          ? { toTerminal: routedPath.toTerminal }
          : {}),
      };

      if (options.dryRun) {
        console.log(
          `${label}: dry-run ${routedPath.detail}; ${routedPath.inputPoints} → ${routedPath.outputPoints} pts, ` +
            `${routedPath.distance} m, ${routedPath.duration} s`,
        );
        continue;
      }

      await target.replaceOne({ _id: id }, document, { upsert: true });
      written += 1;
      console.log(
        `${label}: wrote ${routedPath.detail}; ${routedPath.inputPoints} → ${routedPath.outputPoints} pts, ` +
          `${routedPath.distance} m, ${routedPath.duration} s`,
      );
    }
  } finally {
    await client.close();
  }

  console.log(
    `Done. seen=${seen} routed=${routed} wrote=${written} skipped=${skipped} failed=${failed}`,
  );
  if (failed > 0) {
    process.exitCode = 1;
  }
}

const isDirectRun =
  process.argv[1] !== undefined &&
  path.normalize(fileURLToPath(import.meta.url)) ===
    path.normalize(path.resolve(process.argv[1]));

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
