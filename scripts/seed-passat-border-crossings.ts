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

  const { seedPassatBorderCrossings } = await import(
    "../src/lib/passat-border-crossings-store"
  );
  const { PASSAT_BORDER_CROSSING_SEED } = await import(
    "../src/lib/map/passat-border-crossings"
  );

  const force = process.argv.includes("--force");
  console.log(
    `Seeding PassatBorderCrossings with ${PASSAT_BORDER_CROSSING_SEED.length} rows` +
      (force ? " (force replace)" : "") +
      "…",
  );

  const result = await seedPassatBorderCrossings(force);
  if (result.skipped) {
    console.log(
      "Collection already has border crossings. Re-run with --force to replace them.",
    );
    return;
  }

  console.log(`Inserted ${result.inserted} border crossings.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
