import { describe, expect, it } from "vitest";
import {
  buildCountryChecklist,
  DISPUTED_TERRITORIES,
  summarizeCountryChecklist,
} from "@/lib/map/country-checklist";
import type { CountryFeatureCollection } from "@/lib/map/countries";

const sampleCountries: CountryFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Spain" },
      geometry: null,
    },
    {
      type: "Feature",
      properties: { name: "Ireland" },
      geometry: null,
    },
  ],
};

describe("buildCountryChecklist", () => {
  it("includes map countries and disputed territories", () => {
    const rows = buildCountryChecklist(sampleCountries, [{ name: "Spain" }]);
    const names = rows.map((row) => row.name);
    expect(names).toContain("Spain");
    expect(names).toContain("Ireland");
    for (const territory of DISPUTED_TERRITORIES) {
      expect(names).toContain(territory);
    }
  });

  it("marks visited countries", () => {
    const rows = buildCountryChecklist(sampleCountries, [
      { name: "Spain" },
      { name: "Taiwan" },
    ]);
    expect(rows.find((row) => row.name === "Spain")?.visited).toBe(true);
    expect(rows.find((row) => row.name === "Ireland")?.visited).toBe(false);
    expect(rows.find((row) => row.name === "Taiwan")?.visited).toBe(true);
    expect(rows.find((row) => row.name === "Taiwan")?.disputed).toBe(true);
  });

  it("flags disputed territories already present in the map data", () => {
    const rows = buildCountryChecklist(
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "Palestine" },
            geometry: null,
          },
          {
            type: "Feature",
            properties: { name: "Taiwan" },
            geometry: null,
          },
        ],
      },
      [],
    );
    expect(rows.find((row) => row.name === "Palestine")).toEqual({
      name: "Palestine",
      visited: false,
      disputed: false,
    });
    expect(rows.find((row) => row.name === "Vatican")?.disputed).toBe(false);
    expect(rows.find((row) => row.name === "Taiwan")).toEqual({
      name: "Taiwan",
      visited: false,
      disputed: true,
    });
  });
});

describe("summarizeCountryChecklist", () => {
  it("counts visited rows", () => {
    expect(
      summarizeCountryChecklist([
        { name: "Spain", visited: true, disputed: false },
        { name: "France", visited: false, disputed: false },
      ]),
    ).toEqual({ visited: 1, total: 2 });
  });
});
