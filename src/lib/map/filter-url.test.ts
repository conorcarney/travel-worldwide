import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTER_START,
  DEFAULT_LAYERS,
  DEFAULT_MAP_ZOOM,
  buildCountryVisitMapHref,
  buildMapFilterQuery,
  buildModeMapHref,
  clampFilterRange,
  parseMapFilterSearch,
  parseYearMonthParam,
  resolveInitialMapZoom,
} from "@/lib/map/filter-url";

describe("parseYearMonthParam", () => {
  it("reads YYYY-MM", () => {
    expect(parseYearMonthParam("2019-08")).toEqual({ year: 2019, month: 8 });
  });

  it("rejects junk", () => {
    expect(parseYearMonthParam("Aug 2019")).toBeNull();
    expect(parseYearMonthParam("2019-13")).toBeNull();
  });
});

describe("parseMapFilterSearch", () => {
  it("applies hide and show on top of defaults", () => {
    const parsed = parseMapFilterSearch(
      new URLSearchParams("hide=flight,visited&show=bookmarks&tag=Work"),
    );
    expect(parsed.tags).toEqual(["Work"]);
    expect(parsed.layers.flight).toBe(false);
    expect(parsed.layers.visited).toBe(false);
    expect(parsed.layers.bookmarks).toBe(true);
    expect(parsed.layers.bus).toBe(false);
  });

  it("turns on slow land layers with show=", () => {
    const parsed = parseMapFilterSearch(
      new URLSearchParams("show=bus,ferry,train,car"),
    );
    expect(parsed.layers.bus).toBe(true);
    expect(parsed.layers.ferry).toBe(true);
    expect(parsed.layers.train).toBe(true);
    expect(parsed.layers.car).toBe(true);
    expect(parsed.layers.flight).toBe(true);
    expect(parsed.detailed).toEqual({
      road: true,
      train: true,
      ferry: true,
    });
  });

  it("turns off detailed overlays with detailed=none", () => {
    expect(
      parseMapFilterSearch(new URLSearchParams("detailed=none")).detailed,
    ).toEqual({ road: false, train: false, ferry: false });
  });

  it("reads a subset of detailed overlays", () => {
    expect(
      parseMapFilterSearch(new URLSearchParams("detailed=trains")).detailed,
    ).toEqual({ road: false, train: true, ferry: false });
  });

  it("reads multiple tag params", () => {
    expect(
      parseMapFilterSearch(new URLSearchParams("tag=Work&tag=Family")).tags,
    ).toEqual(["Work", "Family"]);
  });
});

describe("buildMapFilterQuery", () => {
  const boundsMin = { year: 2000, month: 1 };
  const boundsMax = { year: 2027, month: 12 };

  it("always writes speed, zoom, and paused", () => {
    expect(
      buildMapFilterQuery({
        from: DEFAULT_FILTER_START,
        to: boundsMax,
        boundsMin,
        boundsMax,
        tags: [],
        layers: DEFAULT_LAYERS,
        speed: "normal",
        zoom: 6,
        paused: false,
      }),
    ).toBe("speed=normal&zoom=6&paused=0");
  });

  it("writes show= when a slow land layer is turned on", () => {
    expect(
      buildMapFilterQuery({
        from: DEFAULT_FILTER_START,
        to: boundsMax,
        boundsMin,
        boundsMax,
        tags: [],
        layers: { ...DEFAULT_LAYERS, car: true },
        speed: "normal",
        zoom: 6,
        paused: false,
      }),
    ).toBe("show=car&speed=normal&zoom=6&paused=0");
  });

  it("writes detailed=none when overlays are off", () => {
    expect(
      buildMapFilterQuery({
        from: DEFAULT_FILTER_START,
        to: boundsMax,
        boundsMin,
        boundsMax,
        tags: [],
        layers: DEFAULT_LAYERS,
        detailed: { road: false, train: false, ferry: false },
        speed: "normal",
        zoom: 6,
        paused: false,
      }),
    ).toBe("detailed=none&speed=normal&zoom=6&paused=0");
  });

  it("writes from, to, tag, hide, and show", () => {
    expect(
      buildMapFilterQuery({
        from: { year: 2019, month: 8 },
        to: { year: 2020, month: 1 },
        boundsMin,
        boundsMax,
        tags: ["Long distance"],
        layers: { ...DEFAULT_LAYERS, flight: false, bookmarks: true },
        speed: "normal",
        zoom: 6,
        paused: false,
      }),
    ).toBe(
      "from=2019-08&to=2020-01&tag=Long+distance&hide=flight&show=bookmarks&speed=normal&zoom=6&paused=0",
    );
  });

  it("writes multiple tags", () => {
    expect(
      buildMapFilterQuery({
        from: DEFAULT_FILTER_START,
        to: boundsMax,
        boundsMin,
        boundsMax,
        tags: ["Work", "Family"],
        layers: DEFAULT_LAYERS,
        speed: "normal",
        zoom: 6,
        paused: false,
      }),
    ).toBe("tag=Work&tag=Family&speed=normal&zoom=6&paused=0");
  });

  it("writes non-default speed, zoom, and paused", () => {
    expect(
      buildMapFilterQuery({
        from: DEFAULT_FILTER_START,
        to: boundsMax,
        boundsMin,
        boundsMax,
        tags: [],
        layers: DEFAULT_LAYERS,
        speed: "fast",
        zoom: 8,
        paused: true,
      }),
    ).toBe("speed=fast&zoom=8&paused=1");
  });

  it("writes all=1 when show all is on", () => {
    expect(
      buildMapFilterQuery({
        from: DEFAULT_FILTER_START,
        to: boundsMax,
        boundsMin,
        boundsMax,
        tags: [],
        layers: DEFAULT_LAYERS,
        speed: "normal",
        zoom: 6,
        paused: false,
        showAll: true,
      }),
    ).toBe("speed=normal&zoom=6&paused=0&all=1");
  });

  it("writes from when it is not the default start", () => {
    expect(
      buildMapFilterQuery({
        from: boundsMin,
        to: boundsMax,
        boundsMin,
        boundsMax,
        tags: [],
        layers: DEFAULT_LAYERS,
        speed: "normal",
        zoom: 6,
        paused: false,
      }),
    ).toBe("from=2000-01&speed=normal&zoom=6&paused=0");
  });
});

describe("resolveInitialMapZoom", () => {
  it("keeps overview zooms from the URL", () => {
    expect(resolveInitialMapZoom(6)).toBe(6);
    expect(resolveInitialMapZoom(8)).toBe(8);
    expect(resolveInitialMapZoom(2)).toBe(2);
  });

  it("drops legacy follow-cam zooms so loads are not super zoomed in", () => {
    expect(resolveInitialMapZoom(9)).toBe(DEFAULT_MAP_ZOOM);
    expect(resolveInitialMapZoom(15)).toBe(DEFAULT_MAP_ZOOM);
    expect(resolveInitialMapZoom(Number.NaN)).toBe(DEFAULT_MAP_ZOOM);
  });
});

describe("playback URL params", () => {
  it("parses speed, zoom, and paused", () => {
    const parsed = parseMapFilterSearch(
      new URLSearchParams("speed=fastest&zoom=10&paused=1"),
    );
    expect(parsed.speed).toBe("fastest");
    expect(parsed.zoom).toBe(10);
    expect(parsed.paused).toBe(true);
    expect(resolveInitialMapZoom(parsed.zoom)).toBe(DEFAULT_MAP_ZOOM);
  });

  it("falls back to defaults for bad values", () => {
    const parsed = parseMapFilterSearch(
      new URLSearchParams("speed=warp&zoom=nope&paused=0"),
    );
    expect(parsed.speed).toBe("normal");
    expect(parsed.zoom).toBe(6);
    expect(parsed.paused).toBe(false);
  });

  it("reads paused=0 explicitly", () => {
    expect(parseMapFilterSearch(new URLSearchParams("paused=0")).paused).toBe(
      false,
    );
  });

  it("reads show-all from all=1", () => {
    expect(parseMapFilterSearch(new URLSearchParams("all=1")).showAll).toBe(
      true,
    );
    expect(parseMapFilterSearch(new URLSearchParams()).showAll).toBe(false);
  });
});

describe("clampFilterRange", () => {
  it("swaps inverted ranges and clamps to bounds", () => {
    expect(
      clampFilterRange(
        { year: 2022, month: 1 },
        { year: 2019, month: 6 },
        { year: 2018, month: 1 },
        { year: 2025, month: 12 },
      ),
    ).toEqual({
      start: { year: 2019, month: 6 },
      end: { year: 2022, month: 1 },
    });
  });

  it("defaults a missing start to Jan 2025", () => {
    expect(
      clampFilterRange(
        null,
        null,
        { year: 1992, month: 11 },
        { year: 2027, month: 12 },
      ),
    ).toEqual({
      start: { year: 2025, month: 1 },
      end: { year: 2027, month: 12 },
    });
  });
});

describe("buildCountryVisitMapHref", () => {
  it("sets the first-visit month and country tag", () => {
    const href = buildCountryVisitMapHref("Hungary", "09/01/2013");
    expect(href.startsWith("/map?")).toBe(true);
    const parsed = parseMapFilterSearch(
      new URLSearchParams(href.slice("/map?".length)),
    );
    expect(parsed.from).toEqual({ year: 2013, month: 1 });
    expect(parsed.to).toEqual({ year: 2013, month: 1 });
    expect(parsed.tags).toEqual(["Hungary"]);
  });

  it("uses the visit month for a later first visit", () => {
    const parsed = parseMapFilterSearch(
      new URLSearchParams(
        buildCountryVisitMapHref("Germany", "01/10/2013").slice("/map?".length),
      ),
    );
    expect(parsed.from).toEqual({ year: 2013, month: 10 });
    expect(parsed.to).toEqual({ year: 2013, month: 10 });
    expect(parsed.tags).toEqual(["Germany"]);
  });
});

describe("buildModeMapHref", () => {
  it("turns on only that mode and starts the date filter at the earliest year", () => {
    const parsed = parseMapFilterSearch(
      new URLSearchParams(buildModeMapHref("flight").slice("/map?".length)),
    );
    expect(parsed.from).toEqual({ year: 1900, month: 1 });
    expect(parsed.to).toBeNull();
    expect(parsed.showAll).toBe(true);
    expect(parsed.layers).toEqual({
      visited: false,
      flight: true,
      ferry: false,
      bus: false,
      train: false,
      car: false,
      bookmarks: false,
    });
    expect(parsed.detailed).toEqual({
      road: false,
      train: false,
      ferry: false,
    });
  });

  it("hides visited and flights and shows detailed car routes", () => {
    expect(buildModeMapHref("car")).toBe(
      "/map?from=1900-01&hide=visited%2Cflight&show=car&detailed=routes&all=1",
    );
  });

  it("shows only detailed trains for train trips", () => {
    const parsed = parseMapFilterSearch(
      new URLSearchParams(buildModeMapHref("train").slice("/map?".length)),
    );
    expect(parsed.layers.train).toBe(false);
    expect(parsed.layers.flight).toBe(false);
    expect(parsed.detailed).toEqual({
      road: false,
      train: true,
      ferry: false,
    });
  });

  it("limits the date filter to one calendar year", () => {
    const parsed = parseMapFilterSearch(
      new URLSearchParams(
        buildModeMapHref("flight", 2018).slice("/map?".length),
      ),
    );
    expect(parsed.from).toEqual({ year: 2018, month: 1 });
    expect(parsed.to).toEqual({ year: 2018, month: 12 });
    expect(parsed.showAll).toBe(true);
    expect(parsed.layers.flight).toBe(true);
    expect(parsed.layers.bus).toBe(false);
    expect(parsed.detailed.road).toBe(false);
  });
});
