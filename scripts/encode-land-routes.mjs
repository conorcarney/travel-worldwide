/**
 * Batch-encode car and bus land routes into MongoDB `LandRoutes`.
 *
 * Reads BusesTrainsAndFerries, routes each trip through OSRM, simplifies the
 * geometry with Douglas-Peucker, encodes it with Google's polyline algorithm,
 * and upserts:
 *
 *   { _id, departure: { lat, lng }, arrival: { lat, lng },
 *     date, tags,
 *     route: { geometry, distance, duration } }
 *
 * Usage (from the repo root):
 *   npm run encode-land-routes
 *   npm run encode-land-routes -- --dry-run --limit 5
 *
 * This script is not imported by the Next.js app.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { MongoClient, ObjectId } from "mongodb";
import {
  encodePolyline,
  simplifyDouglasPeucker,
} from "./land-route-geometry.mjs";

const { loadEnvConfig } = nextEnv;

const SOURCE_COLLECTION = "BusesTrainsAndFerries";
const TARGET_COLLECTION = "LandRoutes";
const DEFAULT_TYPES = ["Car", "Bus"];
const DEFAULT_OSRM_URL = "https://router.project-osrm.org";
const DEFAULT_DELAY_MS = 1100;
const DEFAULT_EPSILON_M = 30;
const OSRM_TIMEOUT_MS = 30_000;
const OSRM_RETRIES = 4;

function printHelp() {
  console.log(`Encode car and bus land routes into MongoDB ${TARGET_COLLECTION}.

Usage:
  node scripts/encode-land-routes.mjs [options]

Options:
  --dry-run          Route and log without writing (skips existing unless --force)
  --force            Re-route documents that already exist in ${TARGET_COLLECTION}
  --limit <n>        Process at most n source routes
  --delay-ms <n>     Pause between OSRM requests (default ${DEFAULT_DELAY_MS})
  --epsilon-m <n>    Douglas-Peucker tolerance in metres (default ${DEFAULT_EPSILON_M})
  --types <list>     Comma-separated source types (default ${DEFAULT_TYPES.join(",")})
  --id <hex>         Only process this BusesTrainsAndFerries _id
  -h, --help         Show this help

Environment:
  ATLAS_URI or MONGODB_URI   Mongo connection string (.env.local is loaded)
  MONGODB_DB                 Database name (default Countries)
  OSRM_URL                   OSRM base URL (default ${DEFAULT_OSRM_URL})
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

/**
 * @param {string} baseUrl
 * @param {{ lat: number, lng: number }} from
 * @param {{ lat: number, lng: number }} to
 */
function osrmRouteUrl(baseUrl, from, to) {
  const origin = baseUrl.replace(/\/+$/, "");
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  return `${origin}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
}

/**
 * @param {unknown} geometry
 * @returns {{ lat: number, lng: number }[]}
 */
function coordinatesFromGeoJson(geometry) {
  if (
    !geometry ||
    typeof geometry !== "object" ||
    !("coordinates" in geometry) ||
    !Array.isArray(geometry.coordinates)
  ) {
    throw new Error("OSRM response is missing LineString coordinates");
  }

  return geometry.coordinates.map((pair, index) => {
    if (!Array.isArray(pair) || pair.length < 2) {
      throw new Error(`OSRM coordinate ${index} is invalid`);
    }
    const lng = asFiniteNumber(pair[0]);
    const lat = asFiniteNumber(pair[1]);
    if (lat === null || lng === null) {
      throw new Error(`OSRM coordinate ${index} is not numeric`);
    }
    return { lat, lng };
  });
}

/**
 * @param {string} url
 */
async function fetchOsrmRoute(url) {
  let lastError = new Error("OSRM request failed");

  for (let attempt = 0; attempt <= OSRM_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "ahbegrand-encode-land-routes",
        },
        signal: AbortSignal.timeout(OSRM_TIMEOUT_MS),
      });

      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`OSRM HTTP ${response.status}`);
        const waitMs = DEFAULT_DELAY_MS * 2 ** attempt;
        console.warn(`  retry ${attempt + 1}/${OSRM_RETRIES}: ${lastError.message}`);
        await sleep(waitMs);
        continue;
      }

      const payload = await response.json();
      if (payload.code !== "Ok" || !Array.isArray(payload.routes) || !payload.routes[0]) {
        const code = typeof payload.code === "string" ? payload.code : "Unknown";
        throw new Error(`OSRM ${code}`);
      }

      const route = payload.routes[0];
      const points = coordinatesFromGeoJson(route.geometry);
      if (points.length < 2) {
        throw new Error("OSRM geometry has fewer than 2 points");
      }

      return {
        points,
        distance: Math.round(Number(route.distance) || 0),
        duration: Math.round(Number(route.duration) || 0),
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < OSRM_RETRIES && !lastError.message.startsWith("OSRM ")) {
        const waitMs = DEFAULT_DELAY_MS * 2 ** attempt;
        console.warn(`  retry ${attempt + 1}/${OSRM_RETRIES}: ${lastError.message}`);
        await sleep(waitMs);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError;
}

function cacheKey(from, to) {
  return `${from.lng.toFixed(5)},${from.lat.toFixed(5)};${to.lng.toFixed(5)},${to.lat.toFixed(5)}`;
}

function describeRoute(doc) {
  const from = typeof doc.departure === "string" ? doc.departure : "?";
  const to = typeof doc.arrival === "string" ? doc.arrival : "?";
  const type = typeof doc.type === "string" ? doc.type : "?";
  return `${type} ${from} → ${to}`;
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
  const osrmBase = process.env.OSRM_URL ?? DEFAULT_OSRM_URL;

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

  const osrmCache = new Map();
  let seen = 0;
  let routed = 0;
  let written = 0;
  let skipped = 0;
  let failed = 0;
  let firstOsrmCall = true;

  try {
    console.log(
      `Source ${SOURCE_COLLECTION} types=${options.types.join(",")} → ${TARGET_COLLECTION}` +
        (options.dryRun ? " (dry-run)" : ""),
    );

    for await (const doc of cursor) {
      if (options.limit !== null && seen >= options.limit) break;
      seen += 1;

      const id = doc._id;
      const label = `[${seen}] ${describeRoute(doc)}`;
      const date = readText(doc.date);
      const tags = readText(doc.tags);

      if (!options.force && existingIds.has(String(id))) {
        if (!options.dryRun) {
          await target.updateOne({ _id: id }, { $set: { date, tags } });
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

      try {
        const key = cacheKey(departure, arrival);
        let routedPath = osrmCache.get(key);
        if (!routedPath) {
          if (!firstOsrmCall && options.delayMs > 0) {
            await sleep(options.delayMs);
          }
          firstOsrmCall = false;
          const osrm = await fetchOsrmRoute(osrmRouteUrl(osrmBase, departure, arrival));
          const simplified = simplifyDouglasPeucker(osrm.points, options.epsilonM);
          routedPath = {
            geometry: encodePolyline(simplified),
            distance: osrm.distance,
            duration: osrm.duration,
            inputPoints: osrm.points.length,
            outputPoints: simplified.length,
          };
          osrmCache.set(key, routedPath);
        }

        routed += 1;
        const document = {
          _id: id,
          departure,
          arrival,
          date,
          tags,
          route: {
            geometry: routedPath.geometry,
            distance: routedPath.distance,
            duration: routedPath.duration,
          },
        };

        if (options.dryRun) {
          console.log(
            `${label}: dry-run ${routedPath.inputPoints} → ${routedPath.outputPoints} pts, ` +
              `${routedPath.distance} m, ${routedPath.duration} s`,
          );
          continue;
        }

        await target.replaceOne({ _id: id }, document, { upsert: true });
        written += 1;
        console.log(
          `${label}: wrote ${routedPath.inputPoints} → ${routedPath.outputPoints} pts, ` +
            `${routedPath.distance} m, ${routedPath.duration} s`,
        );
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`${label}: ${message}`);
      }
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
