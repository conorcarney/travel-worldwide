import { describe, expect, it } from "vitest";
import { parseMapFilterSearch } from "@/lib/map/filter-url";
import {
  buildPassatCountryMapHref,
  passatCountryMapTarget,
} from "@/lib/map/passat-road-trip";

describe("passatCountryMapTarget", () => {
  it("uses 2025–2026 and the country name as the tag", () => {
    expect(passatCountryMapTarget("France")).toEqual({
      tag: "France",
      fromYear: 2025,
      toYear: 2026,
    });
  });

  it("maps both Kazakhstan rows to the Kazakhstan tag", () => {
    expect(passatCountryMapTarget("Kazakhstan")).toEqual({
      tag: "Kazakhstan",
      fromYear: 2025,
      toYear: 2025,
    });
    expect(passatCountryMapTarget("Kazakhstan 2")).toEqual({
      tag: "Kazakhstan",
      fromYear: 2026,
      toYear: 2026,
    });
  });

  it("does not link the totals row", () => {
    expect(passatCountryMapTarget("Total")).toBeNull();
  });
});

describe("buildPassatCountryMapHref", () => {
  it("selects the country tag, 2025–2026, and only car and ferries", () => {
    const parsed = parseMapFilterSearch(
      new URLSearchParams(
        buildPassatCountryMapHref("France")!.slice("/map?".length),
      ),
    );
    expect(parsed.from).toEqual({ year: 2025, month: 1 });
    expect(parsed.to).toEqual({ year: 2026, month: 12 });
    expect(parsed.tags).toEqual(["France"]);
    expect(parsed.showAll).toBe(true);
    expect(parsed.layers).toEqual({
      visited: false,
      flight: false,
      ferry: true,
      bus: false,
      train: false,
      car: true,
      bookmarks: false,
    });
    expect(parsed.detailed).toEqual({
      road: true,
      train: false,
      ferry: true,
    });
  });

  it("uses 2025 for Kazakhstan and 2026 for Kazakhstan 2", () => {
    const first = parseMapFilterSearch(
      new URLSearchParams(
        buildPassatCountryMapHref("Kazakhstan")!.slice("/map?".length),
      ),
    );
    const second = parseMapFilterSearch(
      new URLSearchParams(
        buildPassatCountryMapHref("Kazakhstan 2")!.slice("/map?".length),
      ),
    );
    expect(first.tags).toEqual(["Kazakhstan"]);
    expect(first.from).toEqual({ year: 2025, month: 1 });
    expect(first.to).toEqual({ year: 2025, month: 12 });
    expect(second.tags).toEqual(["Kazakhstan"]);
    expect(second.from).toEqual({ year: 2026, month: 1 });
    expect(second.to).toEqual({ year: 2026, month: 12 });
  });
});
