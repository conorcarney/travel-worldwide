import { describe, expect, it } from "vitest";
import {
  blogCountryNameSet,
  countryBaseStyle,
  countryHoverStyle,
  featureCountryStatus,
  featureIsVisited,
  normalizeCountryList,
  visitedNameSet,
} from "@/lib/map/countries";

describe("visitedNameSet", () => {
  it("normalizes visited country names", () => {
    const set = visitedNameSet([
      { name: "Ireland" },
      { name: " United Kingdom " },
    ]);
    expect(set.has("ireland")).toBe(true);
    expect(set.has("united kingdom")).toBe(true);
  });
});

describe("blogCountryNameSet", () => {
  it("uses blog.name as the country key", () => {
    const set = blogCountryNameSet([
      { name: "Hungary" },
      { name: "Montenegro" },
    ]);
    expect(set.has("hungary")).toBe(true);
    expect(set.has("montenegro")).toBe(true);
  });
});

describe("featureIsVisited", () => {
  const visited = visitedNameSet([{ name: "Belize" }]);

  it("matches against common Natural Earth name fields", () => {
    expect(
      featureIsVisited({ name: "Belize", admin: "Other" }, visited),
    ).toBe(true);
    expect(featureIsVisited({ admin: "Belize" }, visited)).toBe(true);
    expect(featureIsVisited({ name: "Spain" }, visited)).toBe(false);
  });
});

describe("featureCountryStatus", () => {
  const visited = visitedNameSet([
    { name: "Ireland" },
    { name: "Spain" },
  ]);
  const blogs = blogCountryNameSet([{ name: "Ireland" }]);

  it("marks blog countries even when also visited", () => {
    expect(featureCountryStatus({ name: "Ireland" }, visited, blogs)).toBe(
      "blog",
    );
  });

  it("marks visited countries without blogs as visited", () => {
    expect(featureCountryStatus({ name: "Spain" }, visited, blogs)).toBe(
      "visited",
    );
  });

  it("marks other countries as none", () => {
    expect(featureCountryStatus({ name: "France" }, visited, blogs)).toBe(
      "none",
    );
  });
});

describe("normalizeCountryList", () => {
  it("extracts the FeatureCollection from Mongo documents", () => {
    const geo = normalizeCountryList([
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "Belize" },
            geometry: { type: "Point", coordinates: [0, 0] },
          },
        ],
      },
    ]);

    expect(geo.type).toBe("FeatureCollection");
    expect(geo.features).toHaveLength(1);
    expect(geo.features[0]?.properties.name).toBe("Belize");
  });

  it("returns an empty collection when data is invalid", () => {
    expect(normalizeCountryList([{ foo: 1 }])).toEqual({
      type: "FeatureCollection",
      features: [],
    });
  });
});

describe("country styles", () => {
  it("uses light green for visited-only and orange for blog", () => {
    expect(countryBaseStyle("visited").fillColor).toBe("#9fd9b5");
    expect(countryBaseStyle("blog").fillColor).toBe("#e67e22");
  });

  it("uses stronger fill on hover than the base style", () => {
    expect(countryHoverStyle("blog").fillOpacity).toBeGreaterThan(
      countryBaseStyle("blog").fillOpacity ?? 0,
    );
    expect(countryHoverStyle("visited").fillOpacity).toBeGreaterThan(
      countryBaseStyle("visited").fillOpacity ?? 0,
    );
  });
});
