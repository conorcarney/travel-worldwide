import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();

  const { seedCountryRatings } = await import(
    "../src/lib/country-ratings-store"
  );
  const { COUNTRY_RATING_SEED } = await import("../src/lib/map/country-ratings");

  const force = process.argv.includes("--force");
  console.log(
    `Seeding CountryRatings with ${COUNTRY_RATING_SEED.length} rows` +
      (force ? " (force replace)" : "") +
      "…",
  );

  const result = await seedCountryRatings(force);
  if (result.skipped) {
    console.log(
      "Collection already has ratings. Re-run with --force to replace them.",
    );
    return;
  }

  console.log(`Inserted ${result.inserted} country ratings.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
