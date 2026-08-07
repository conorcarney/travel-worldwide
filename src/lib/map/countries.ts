import { z } from "zod";
import type { PathOptions } from "leaflet";
import type { MongoVisited } from "@/lib/validations/map-data";

const countryFeatureSchema = z.object({
  type: z.literal("Feature").optional(),
  properties: z
    .object({
      name: z.string().optional().nullable(),
      name_long: z.string().optional().nullable(),
      admin: z.string().optional().nullable(),
      brk_name: z.string().optional().nullable(),
      formal_en: z.string().optional().nullable(),
    })
    .passthrough(),
  geometry: z.unknown(),
});

const countryCollectionSchema = z.object({
  type: z.literal("FeatureCollection").optional(),
  features: z.array(countryFeatureSchema),
});

export type CountryFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: unknown;
  }>;
};

/** green = blog, orange = visited without blog, none = not visited */
export type CountryFillStatus = "blog" | "visited" | "none";

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function featureNameCandidates(
  properties: Record<string, unknown> | null | undefined,
): string[] {
  if (!properties) return [];

  return [
    properties.name,
    properties.name_long,
    properties.admin,
    properties.brk_name,
    properties.formal_en,
  ].flatMap((value) =>
    typeof value === "string" && value.trim()
      ? [normalizeName(value)]
      : [],
  );
}

function nameSetMatches(
  properties: Record<string, unknown> | null | undefined,
  names: Set<string>,
): boolean {
  if (!properties || names.size === 0) return false;
  return featureNameCandidates(properties).some((name) => names.has(name));
}

/** Build a lookup of visited country names from Atlas Visited docs. */
export function visitedNameSet(visited: MongoVisited[]): Set<string> {
  return new Set(
    visited
      .map((item) => item.name)
      .filter(Boolean)
      .map(normalizeName),
  );
}

/** Blogs use `name` as the country the post is about. */
export function blogCountryNameSet(
  blogs: Array<{ name: string }>,
): Set<string> {
  return new Set(
    blogs
      .map((blog) => blog.name)
      .filter(Boolean)
      .map(normalizeName),
  );
}

export function featureIsVisited(
  properties: Record<string, unknown> | null | undefined,
  visited: Set<string>,
): boolean {
  return nameSetMatches(properties, visited);
}

export function featureCountryStatus(
  properties: Record<string, unknown> | null | undefined,
  visited: Set<string>,
  blogCountries: Set<string>,
): CountryFillStatus {
  if (nameSetMatches(properties, blogCountries)) {
    return "blog";
  }
  if (nameSetMatches(properties, visited)) {
    return "visited";
  }
  return "none";
}

export function countryDisplayName(
  properties: Record<string, unknown> | null | undefined,
): string {
  if (!properties) return "Unknown";

  for (const key of [
    "name",
    "name_long",
    "admin",
    "brk_name",
    "formal_en",
  ] as const) {
    const value = properties[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "Unknown";
}

export const COUNTRY_FILL_COLORS = {
  blog: "#3d9b6a",
  /** Very light orange — almost transparent on the map */
  visited: "#f8d4a8",
  none: "#64748b",
} as const;

export function countryBaseStyle(status: CountryFillStatus): PathOptions {
  if (status === "blog") {
    return {
      fillColor: COUNTRY_FILL_COLORS.blog,
      fillOpacity: 0.55,
      color: "#2f7a54",
      weight: 1,
      fill: true,
    };
  }

  if (status === "visited") {
    return {
      fillColor: COUNTRY_FILL_COLORS.visited,
      fillOpacity: 0.12,
      color: "#e8b87a",
      weight: 0.6,
      opacity: 0.35,
      fill: true,
    };
  }

  return {
    fillColor: COUNTRY_FILL_COLORS.none,
    fillOpacity: 0.06,
    color: "#94a3b8",
    weight: 0.4,
    opacity: 0.35,
    fill: true,
  };
}

export function countryHoverStyle(status: CountryFillStatus): PathOptions {
  if (status === "blog") {
    return {
      fillColor: "#5ecf8c",
      fillOpacity: 0.8,
      color: "#1f5c3d",
      weight: 2,
      fill: true,
    };
  }

  if (status === "visited") {
    return {
      fillColor: "#f5c99a",
      fillOpacity: 0.28,
      color: "#e0a86a",
      weight: 1.25,
      opacity: 0.55,
      fill: true,
    };
  }

  return {
    fillColor: "#38bdf8",
    fillOpacity: 0.4,
    color: "#0ea5e9",
    weight: 1.5,
    fill: true,
  };
}

/** CountryList stores one FeatureCollection document in Mongo. */
export function normalizeCountryList(data: unknown[]): CountryFeatureCollection {
  for (const item of data) {
    const parsed = countryCollectionSchema.safeParse(item);
    if (!parsed.success) continue;

    return {
      type: "FeatureCollection",
      features: parsed.data.features.map((feature) => ({
        type: "Feature" as const,
        properties: feature.properties as Record<string, unknown>,
        geometry: feature.geometry,
      })),
    };
  }

  return { type: "FeatureCollection", features: [] };
}
