import {
  countryDisplayName,
  featureIsVisited,
  visitedNameSet,
  type CountryFeatureCollection,
} from "@/lib/map/countries";
import type { MongoVisited } from "@/lib/validations/map-data";

/** Territories beyond UN members shown on the statistics checklist. */
export const DISPUTED_TERRITORIES = [
  "Abkhazia",
  "Northern Cyprus",
  "Palestine",
  "Somaliland",
  "South Ossetia",
  "Taiwan",
  "Transnistria",
  "Vatican",
  "Western Sahara",
] as const;

/** Extra checklist names that are not labelled "disputed" in the UI. */
const UNDISPUTED_EXTRA_TERRITORIES = new Set(
  ["Palestine", "Vatican"].map((name) => name.toLowerCase()),
);

export type CountryChecklistRow = {
  name: string;
  visited: boolean;
  disputed: boolean;
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function rowKey(name: string): string {
  return normalizeName(name);
}

function isDisputedTerritory(name: string): boolean {
  return !UNDISPUTED_EXTRA_TERRITORIES.has(normalizeName(name));
}

/** Build alphabetised checklist rows from map countries + disputed territories. */
export function buildCountryChecklist(
  countries: CountryFeatureCollection,
  visited: MongoVisited[],
): CountryChecklistRow[] {
  const visitedNames = visitedNameSet(visited);
  const rows = new Map<string, CountryChecklistRow>();

  for (const feature of countries.features) {
    const name = countryDisplayName(feature.properties);
    if (name === "Unknown") continue;
    const key = rowKey(name);
    rows.set(key, {
      name,
      visited: featureIsVisited(feature.properties, visitedNames),
      disputed: false,
    });
  }

  for (const territory of DISPUTED_TERRITORIES) {
    const key = rowKey(territory);
    const disputed = isDisputedTerritory(territory);
    if (rows.has(key)) {
      const existing = rows.get(key)!;
      rows.set(key, { ...existing, disputed });
      continue;
    }
    rows.set(key, {
      name: territory,
      visited: visitedNames.has(key),
      disputed,
    });
  }

  return [...rows.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" }),
  );
}

export function summarizeCountryChecklist(rows: CountryChecklistRow[]): {
  visited: number;
  total: number;
} {
  return {
    visited: rows.filter((row) => row.visited).length,
    total: rows.length,
  };
}
