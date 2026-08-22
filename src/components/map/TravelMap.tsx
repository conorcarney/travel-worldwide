"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CircleMarker,
  MapContainer,
  Popup,
  Polyline,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { fetchApiList } from "@/lib/map/parse-api";
import {
  normalizeBookmarks,
  normalizeBlogs,
  normalizeFlights,
  normalizeSurfaceRoutes,
  normalizeVisited,
  ROUTE_COLORS,
} from "@/lib/map/normalize";
import {
  blogCountryNameSet,
  normalizeCountryList,
  visitedNameSet,
  type CountryFeatureCollection,
} from "@/lib/map/countries";
import {
  clampYearMonth,
  filterByMonthRange,
  getMonthBounds,
  inMonthRange,
} from "@/lib/map/years";
import { allVisitDates, isVisitedInFilter } from "@/lib/map/visit-dates";
import { summarizeTravelStats } from "@/lib/map/distance";
import {
  buildPlaybackSteps,
  collectEventMonths,
  filterByPlaybackMonth,
  formatYearMonth,
  formatYearMonthRange,
  formatTripDate,
  isOnOrBefore,
  parseYearMonth,
  yearMonthKey,
  type YearMonth,
} from "@/lib/map/timeline";
import { summarizeNewCountriesByYear } from "@/lib/map/visited-stats";
import {
  PLAYBACK_SPEEDS,
  collectRouteTags,
  filterRoutesByTags,
  parseRouteTags,
  playbackSpeedMultiplier,
  type FollowCameraState,
  type PlaybackSpeedId,
} from "@/lib/map/journey";
import type {
  MapBookmark,
  MapRoute,
  MongoBlog,
  MongoVisited,
} from "@/lib/validations/map-data";
import {
  buildMapFilterQuery,
  clampFilterRange,
  parseMapFilterSearch,
} from "@/lib/map/filter-url";
import {
  MapControls,
  type LayerVisibility,
} from "@/components/map/MapControls";
import { JourneyMediaOverlay } from "@/components/map/JourneyMediaOverlay";
import { MapLoadingSpinner } from "@/components/map/MapLoadingSpinner";
import { OpenFreeMapLayer } from "@/components/map/OpenFreeMapLayer";
import { TravelStats } from "@/components/map/TravelStats";
import { VisitedCountriesLayer } from "@/components/map/VisitedCountriesLayer";
import {
  FitRoutesWhenComplete,
  JourneyFollow,
} from "@/components/map/JourneyFollow";

type MapStatus = "loading" | "ready" | "error";

function filterVisitedForPlayback(
  items: MongoVisited[],
  cursor: YearMonth | null,
  playbackComplete: boolean,
  rangeStart: YearMonth,
  rangeEnd: YearMonth,
): MongoVisited[] {
  return items.filter((item) =>
    isVisitedInFilter(
      item,
      rangeStart,
      rangeEnd,
      cursor,
      playbackComplete,
    ),
  );
}

function filterBlogsForPlayback(
  items: MongoBlog[],
  cursor: YearMonth | null,
  playbackComplete: boolean,
  rangeStart: YearMonth,
  rangeEnd: YearMonth,
): MongoBlog[] {
  return items.filter((item) => {
    const date = item.date_of_first_visit?.trim() ?? "";
    if (!date) return playbackComplete;
    if (!inMonthRange(date, rangeStart, rangeEnd)) return false;
    return isOnOrBefore(date, cursor);
  });
}

function playbackCutoff(
  complete: boolean,
  cursor: YearMonth | null,
  months: YearMonth[],
  rangeEnd: YearMonth,
): YearMonth | null {
  if (complete) {
    return months[months.length - 1] ?? rangeEnd;
  }
  return cursor;
}

function journeyTitle(route: MapRoute): string {
  const date = formatTripDate(route.date);
  return date ? `${route.from} → ${route.to} · ${date}` : `${route.from} → ${route.to}`;
}

const PLAYBACK_BAR_BUTTON =
  "inline-flex items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 py-0.5 text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground";

const PLAYBACK_BAR_BUTTON_ON =
  "inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent px-2.5 py-0.5 text-white";

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="h-[0.8em] w-[0.8em] shrink-0"
      aria-hidden
    >
      <path fill="currentColor" d="M3.2 1.4v9.2L10.6 6Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="h-[0.8em] w-[0.8em] shrink-0"
      aria-hidden
    >
      <rect x="2.1" y="1.5" width="2.6" height="9" rx="0.4" fill="currentColor" />
      <rect x="7.3" y="1.5" width="2.6" height="9" rx="0.4" fill="currentColor" />
    </svg>
  );
}

function SkipBackIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="h-[0.8em] w-[0.8em] shrink-0"
      aria-hidden
    >
      <path fill="currentColor" d="M10.6 1.4 3.2 6l7.4 4.6V1.4ZM1.4 1.5h2.1v9H1.4z" />
    </svg>
  );
}

function SkipForwardIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="h-[0.8em] w-[0.8em] shrink-0"
      aria-hidden
    >
      <path fill="currentColor" d="M1.4 1.4 8.8 6 1.4 10.6V1.4ZM8.5 1.5h2.1v9H8.5z" />
    </svg>
  );
}

export default function TravelMap() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<MapStatus>("loading");
  const [, setSource] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<MapRoute[]>([]);
  const [bookmarks, setBookmarks] = useState<MapBookmark[]>([]);
  const [visited, setVisited] = useState<MongoVisited[]>([]);
  const [blogs, setBlogs] = useState<MongoBlog[]>([]);
  const [countries, setCountries] = useState<CountryFeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });
  const [layers, setLayers] = useState<LayerVisibility>(
    () => parseMapFilterSearch(searchParams).layers,
  );
  const [rangeMin, setRangeMin] = useState<YearMonth>({ year: 2000, month: 1 });
  const [rangeMax, setRangeMax] = useState<YearMonth>({ year: 2027, month: 12 });
  const [rangeStart, setRangeStart] = useState<YearMonth>({
    year: 2000,
    month: 1,
  });
  const [rangeEnd, setRangeEnd] = useState<YearMonth>({
    year: 2027,
    month: 12,
  });
  const [playbackMonth, setPlaybackMonth] = useState<YearMonth | null>(null);
  const [playbackComplete, setPlaybackComplete] = useState(false);
  const [tripIndex, setTripIndex] = useState(0);
  const [playGeneration, setPlayGeneration] = useState(0);
  const [revealedRouteIds, setRevealedRouteIds] = useState<string[]>([]);
  const [activeJourney, setActiveJourney] = useState<MapRoute | null>(null);
  const [playbackPaused, setPlaybackPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeedId>("slow");
  const [showAll, setShowAll] = useState(false);
  const [tagFilters, setTagFilters] = useState(
    () => parseMapFilterSearch(searchParams).tags,
  );
  const layersRef = useRef(layers);
  const userFollowZoomRef = useRef<number | null>(null);
  const followCameraRef = useRef<FollowCameraState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const request = { signal: controller.signal };

    async function loadCore() {
      try {
        setError(null);
        setStatus("loading");
        const [visitedRes, flightsRes, surfaceRes, bookmarksRes, blogsRes] =
          await Promise.all([
            fetchApiList("/api/visited", request),
            fetchApiList("/api/flights", request),
            fetchApiList("/api/buses-trains-ferries", request),
            fetchApiList("/api/maps-me-bookmarks", request),
            fetchApiList("/api/blogs", request),
          ]);

        if (cancelled) return;

        const failed = [
          visitedRes,
          flightsRes,
          surfaceRes,
          bookmarksRes,
          blogsRes,
        ].find((res) => !res.ok);
        if (failed) {
          setStatus("error");
          setError(failed.error ?? "Failed to load map data");
          return;
        }

        const flightRoutes = normalizeFlights(flightsRes.data ?? []);
        const surfaceRoutes = normalizeSurfaceRoutes(surfaceRes.data ?? []);
        const allRoutes = [...flightRoutes, ...surfaceRoutes];
        const mapBookmarks = normalizeBookmarks(bookmarksRes.data ?? []);
        const visitedCountries = normalizeVisited(visitedRes.data ?? []);
        const blogPosts = normalizeBlogs(blogsRes.data ?? []);

        const bounds = getMonthBounds([
          ...allRoutes.map((route) => route.date),
          ...mapBookmarks.map((bookmark) => bookmark.date),
          ...visitedCountries.map((item) => item.date ?? ""),
          ...blogPosts.map((item) => item.date_of_first_visit ?? ""),
        ]);

        setVisited(visitedCountries);
        setBlogs(blogPosts);
        setRoutes(allRoutes);
        setBookmarks(mapBookmarks);
        setRangeMin(bounds.min);
        setRangeMax(bounds.max);
        const filter = parseMapFilterSearch(
          new URLSearchParams(window.location.search),
        );
        const range = clampFilterRange(
          filter.from,
          filter.to,
          bounds.min,
          bounds.max,
        );
        setRangeStart(range.start);
        setRangeEnd(range.end);
        setSource(flightsRes.source ?? visitedRes.source ?? "unknown");
        setStatus("ready");
        setPlaybackMonth(null);
        setRevealedRouteIds([]);
        setActiveJourney(null);
        setPlaybackPaused(false);
        setPlaybackComplete(false);
        setShowAll(false);
        setTripIndex(0);
        setPlayGeneration((value) => value + 1);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to load map");
      }
    }

    async function loadCountries() {
      try {
        const countryListRes = await fetchApiList("/api/country-list", request);
        if (cancelled || !countryListRes.ok) return;
        const countryGeo = normalizeCountryList(countryListRes.data ?? []);
        if (cancelled) return;
        startTransition(() => {
          setCountries(countryGeo);
        });
      } catch {
        // Playback still works without country fills.
      }
    }

    void loadCore();
    void loadCountries();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    const query = buildMapFilterQuery({
      from: rangeStart,
      to: rangeEnd,
      boundsMin: rangeMin,
      boundsMax: rangeMax,
      tags: tagFilters,
      layers,
    });
    const current = window.location.search.replace(/^\?/, "");
    if (current === query) return;
    const href = query ? `${pathname}?${query}` : pathname;
    const timer = window.setTimeout(() => {
      window.history.replaceState(window.history.state, "", href);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [
    status,
    rangeStart,
    rangeEnd,
    rangeMin,
    rangeMax,
    tagFilters,
    layers,
    pathname,
  ]);

  const availableTags = useMemo(() => collectRouteTags(routes), [routes]);

  const taggedRoutes = useMemo(
    () => filterRoutesByTags(routes, tagFilters),
    [routes, tagFilters],
  );

  const yearFilteredRoutes = useMemo(
    () => filterByMonthRange(taggedRoutes, rangeStart, rangeEnd),
    [taggedRoutes, rangeStart, rangeEnd],
  );
  const yearFilteredBookmarks = useMemo(
    () => filterByMonthRange(bookmarks, rangeStart, rangeEnd),
    [bookmarks, rangeStart, rangeEnd],
  );

  const timelineMonths = useMemo(() => {
    const dates = tagFilters.length > 0
      ? yearFilteredRoutes.map((route) => route.date)
      : [
        ...yearFilteredRoutes.map((route) => route.date),
        ...yearFilteredBookmarks.map((bookmark) => bookmark.date),
        ...visited.flatMap((item) =>
          allVisitDates(item).filter((date) =>
            inMonthRange(date, rangeStart, rangeEnd),
          ),
        ),
        ...blogs
          .filter(
            (item) =>
              item.date_of_first_visit &&
              inMonthRange(item.date_of_first_visit, rangeStart, rangeEnd),
          )
          .map((item) => item.date_of_first_visit as string),
      ];
    return collectEventMonths(dates);
  }, [
    tagFilters,
    yearFilteredRoutes,
    yearFilteredBookmarks,
    visited,
    blogs,
    rangeStart,
    rangeEnd,
  ]);

  const routeById = useMemo(() => {
    const byId = new Map<string, MapRoute>();
    for (const route of yearFilteredRoutes) {
      byId.set(route.id, route);
    }
    return byId;
  }, [yearFilteredRoutes]);

  const playbackSteps = useMemo(
    () => buildPlaybackSteps(timelineMonths, yearFilteredRoutes),
    [timelineMonths, yearFilteredRoutes],
  );

  const tripQueue = useMemo(
    () =>
      playbackSteps
        .filter(
          (step): step is { kind: "route"; routeId: string } =>
            step.kind === "route",
        )
        .map((step) => step.routeId),
    [playbackSteps],
  );

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    if (status !== "ready" || showAll || playbackComplete) return;

    if (tripQueue.length === 0) {
      setShowAll(true);
      setPlaybackComplete(true);
      setActiveJourney(null);
      return;
    }

    if (tripIndex >= tripQueue.length) {
      followCameraRef.current = null;
      setActiveJourney(null);
      setShowAll(true);
      setPlaybackComplete(true);
      setPlaybackPaused(false);
      return;
    }

    let playable = tripIndex;
    while (playable < tripQueue.length) {
      const candidate = routeById.get(tripQueue[playable]!);
      if (candidate && layersRef.current[candidate.mode]) break;
      playable += 1;
    }
    setRevealedRouteIds(tripQueue.slice(0, Math.min(playable + 1, tripQueue.length)));
    if (playable !== tripIndex) {
      setTripIndex(playable);
      return;
    }

    const route = routeById.get(tripQueue[tripIndex]);
    if (!route) return;

    setPlaybackMonth(parseYearMonth(route.date));
    setActiveJourney(route);
  }, [
    status,
    showAll,
    playbackComplete,
    tripIndex,
    tripQueue,
    routeById,
    playGeneration,
  ]);

  const playbackCursor = playbackMonth;
  const playbackFinished =
    playbackComplete || (status === "ready" && timelineMonths.length === 0);

  const cutoff = playbackCutoff(
    playbackFinished,
    playbackCursor,
    timelineMonths,
    rangeEnd,
  );

  const revealedRouteIdSet = useMemo(
    () => new Set(revealedRouteIds),
    [revealedRouteIds],
  );

  const visibleRoutes = yearFilteredRoutes.filter((route) => {
    if (!layers[route.mode]) return false;
    if (playbackFinished) return true;
    return revealedRouteIdSet.has(route.id);
  });

  const visibleBookmarks = layers.bookmarks
    ? filterByPlaybackMonth(yearFilteredBookmarks, cutoff, {
      includeUndatedWhenComplete: true,
      playbackComplete: playbackFinished,
    })
    : [];

  const visibleVisited = filterVisitedForPlayback(
    visited,
    cutoff,
    playbackFinished,
    rangeStart,
    rangeEnd,
  );
  const visibleBlogs = filterBlogsForPlayback(
    blogs,
    cutoff,
    playbackFinished,
    rangeStart,
    rangeEnd,
  );

  const visitedNames = visitedNameSet(visibleVisited);
  const blogCountryNames = blogCountryNameSet(visibleBlogs);
  const statsSummary = summarizeTravelStats(
    playbackFinished
      ? filterByPlaybackMonth(yearFilteredRoutes, cutoff, {
        includeUndatedWhenComplete: true,
        playbackComplete: true,
      })
      : yearFilteredRoutes.filter((route) => revealedRouteIdSet.has(route.id)),
  );
  const countriesByYear = summarizeNewCountriesByYear(
    visibleVisited,
    rangeStart.year,
    rangeEnd.year,
  );
  const rangeLabel = formatYearMonthRange(rangeStart, rangeEnd);
  const asOfLabel = playbackFinished
    ? rangeLabel
    : playbackCursor
      ? formatYearMonth(playbackCursor)
      : "";

  function toggleLayer(key: keyof LayerVisibility) {
    setLayers((current) => ({ ...current, [key]: !current[key] }));
  }

  function restartPlayback() {
    followCameraRef.current = null;
    setShowAll(false);
    setActiveJourney(null);
    setRevealedRouteIds([]);
    setPlaybackMonth(null);
    setPlaybackPaused(false);
    setPlaybackComplete(false);
    setTripIndex(0);
    setPlayGeneration((value) => value + 1);
  }

  function applyFilterRange(start: YearMonth, end: YearMonth) {
    const startKey = yearMonthKey(start);
    const endKey = yearMonthKey(end);
    const nextStart = startKey <= endKey ? start : end;
    const nextEnd = startKey <= endKey ? end : start;
    startTransition(() => {
      setRangeStart(clampYearMonth(nextStart, rangeMin, rangeMax));
      setRangeEnd(clampYearMonth(nextEnd, rangeMin, rangeMax));
      if (!showAll) restartPlayback();
    });
  }

  function updateRangeStart(value: YearMonth) {
    startTransition(() => {
      setRangeStart(clampYearMonth(value, rangeMin, rangeEnd));
      if (!showAll) restartPlayback();
    });
  }

  function updateRangeEnd(value: YearMonth) {
    startTransition(() => {
      setRangeEnd(clampYearMonth(value, rangeStart, rangeMax));
      if (!showAll) restartPlayback();
    });
  }

  function updateTagFilters(tags: string[]) {
    startTransition(() => {
      setTagFilters(tags);
      if (!showAll) restartPlayback();
    });
  }

  function enableShowAll() {
    userFollowZoomRef.current = null;
    followCameraRef.current = null;
    setShowAll(true);
    setActiveJourney(null);
    setPlaybackPaused(false);
    setRevealedRouteIds(
      yearFilteredRoutes
        .filter((route) => parseYearMonth(route.date) !== null)
        .map((route) => route.id),
    );
    setPlaybackMonth(timelineMonths[timelineMonths.length - 1] ?? null);
    setPlaybackComplete(true);
  }

  function toggleShowAll() {
    if (showAll) {
      restartPlayback();
      return;
    }
    enableShowAll();
  }

  function togglePlaybackPaused() {
    setPlaybackPaused((current) => !current);
  }

  function skipBack() {
    if (showAll || playbackComplete) {
      setShowAll(false);
      setPlaybackComplete(false);
      setPlaybackPaused(false);
      setTripIndex(Math.max(tripQueue.length - 1, 0));
      setPlayGeneration((value) => value + 1);
      return;
    }
    setTripIndex((current) => Math.max(current - 1, 0));
    setPlayGeneration((value) => value + 1);
  }

  function skipForward() {
    if (showAll || playbackComplete) return;
    setTripIndex((current) => current + 1);
  }

  function handleJourneyComplete(routeId: string) {
    setRevealedRouteIds((ids) =>
      ids.includes(routeId) ? ids : [...ids, routeId],
    );
    if (tripQueue[tripIndex] !== routeId) return;
    setTripIndex((current) => current + 1);
  }

  const playbackLabel = showAll
    ? `Showing all${asOfLabel ? ` · ${asOfLabel}` : ""}`
    : playbackFinished
      ? "Playback complete"
      : playbackPaused
        ? `Paused${playbackCursor ? ` · ${formatYearMonth(playbackCursor)}` : ""
        }${activeJourney ? ` · ${journeyTitle(activeJourney)}` : ""}`
        : playbackCursor
          ? `Playing · ${formatYearMonth(playbackCursor)}${activeJourney ? ` · ${journeyTitle(activeJourney)}` : ""
          }`
          : "Playing · starting…";
  const activeTags = activeJourney ? parseRouteTags(activeJourney.tags) : [];

  return (
    <div className="relative flex flex-1 flex-col" data-testid="travel-map">
      {status === "error" ? (
        <div className="border-b border-[#b5c5ca] bg-[#d4e0e4] px-4 py-3 text-sm text-background sm:px-6">
          <span data-testid="map-status">Error: {error}</span>
        </div>
      ) : null}

      {status === "ready" ? (
        <MapControls
          layers={layers}
          onToggleLayer={toggleLayer}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          rangeMin={rangeMin}
          rangeMax={rangeMax}
          onRangeStartChange={updateRangeStart}
          onRangeEndChange={updateRangeEnd}
          onRangeApply={applyFilterRange}
          tagFilters={tagFilters}
          tagOptions={availableTags}
          onTagFiltersChange={updateTagFilters}
          noTagResults={
            tagFilters.length > 0 && yearFilteredRoutes.length === 0
          }
          visibleCounts={{
            visited: layers.visited ? visitedNames.size : 0,
            routes: visibleRoutes.length,
            bookmarks: visibleBookmarks.length,
            asOfLabel,
          }}
        />
      ) : null}

      <div className="relative min-h-[60vh] flex-1" data-testid="leaflet-root">
        {status === "loading" ? <MapLoadingSpinner overlay /> : null}
        {activeJourney ? (
          <JourneyMediaOverlay
            media={activeJourney.media}
            title={journeyTitle(activeJourney)}
          />
        ) : null}
        {status === "ready" ? (
          <div className="pointer-events-auto absolute bottom-4 left-1/2 z-[1100] flex w-[min(96%,52rem)] -translate-x-1/2 flex-col items-center gap-2">
            <div
              className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-2 text-sm text-foreground shadow"
              data-testid="map-playback"
            >
              <span className="sr-only" aria-live="polite">
                {playbackLabel}
              </span>
              <button
                type="button"
                className={PLAYBACK_BAR_BUTTON}
                onClick={skipBack}
                disabled={
                  !showAll && !playbackFinished && tripIndex === 0
                }
                data-testid="playback-skip-back"
              >
                <SkipBackIcon />
                Back
              </button>
              {!showAll && !playbackFinished ? (
                <button
                  type="button"
                  className={
                    playbackPaused ? PLAYBACK_BAR_BUTTON : PLAYBACK_BAR_BUTTON_ON
                  }
                  onClick={togglePlaybackPaused}
                  data-testid="playback-pause"
                  aria-pressed={playbackPaused}
                >
                  {playbackPaused ? <PlayIcon /> : <PauseIcon />}
                  {playbackPaused ? "Play" : "Pause"}
                </button>
              ) : null}
              <button
                type="button"
                className={PLAYBACK_BAR_BUTTON}
                onClick={skipForward}
                disabled={showAll || playbackFinished}
                data-testid="playback-skip-forward"
              >
                Next
                <SkipForwardIcon />
              </button>
              <button
                type="button"
                className={
                  showAll ? PLAYBACK_BAR_BUTTON_ON : PLAYBACK_BAR_BUTTON
                }
                onClick={toggleShowAll}
                data-testid="playback-show-all"
                aria-pressed={showAll}
              >
                Show all
              </button>
              {showAll || playbackFinished ? (
                <button
                  type="button"
                  className={PLAYBACK_BAR_BUTTON}
                  onClick={restartPlayback}
                  data-testid="playback-replay"
                >
                  <PlayIcon />
                  Replay
                </button>
              ) : null}
              <span
                className="inline-flex flex-wrap items-center gap-1"
                data-testid="playback-speed"
              >
                {PLAYBACK_SPEEDS.map((speed) => (
                  <button
                    key={speed.id}
                    type="button"
                    className={
                      playbackSpeed === speed.id
                        ? PLAYBACK_BAR_BUTTON_ON
                        : PLAYBACK_BAR_BUTTON
                    }
                    onClick={() => setPlaybackSpeed(speed.id)}
                    aria-pressed={playbackSpeed === speed.id}
                    data-testid={`playback-speed-${speed.id}`}
                  >
                    {speed.label}
                  </button>
                ))}
              </span>
            </div>
            {activeJourney ? (
              <p
                className="w-full rounded-xl border border-border bg-surface/90 px-4 py-2 text-center text-foreground shadow"
                data-testid="journey-caption"
                aria-live="polite"
              >
                <span className="block text-base sm:text-lg">
                  <span className="capitalize">{activeJourney.mode}</span>
                  {": "}
                  {journeyTitle(activeJourney)}
                </span>
                {activeTags.length > 0 ? (
                  <span className="mt-1 block text-sm text-muted">
                    {activeTags.join(" · ")}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : null}
        <MapContainer
          center={[53.3498, -6.2603]}
          zoom={6}
          minZoom={1}
          maxBounds={[
            [180, Number.NEGATIVE_INFINITY],
            [-180, Number.POSITIVE_INFINITY],
          ]}
          maxBoundsViscosity={1}
          className="h-full min-h-[60vh] w-full"
          scrollWheelZoom
          attributionControl
        >
          <OpenFreeMapLayer />

          {layers.visited && countries.features.length > 0 ? (
            <VisitedCountriesLayer
              countries={countries}
              visitedNames={visitedNames}
              blogCountryNames={blogCountryNames}
              blogs={visibleBlogs}
            />
          ) : null}

          {visibleRoutes.map((route) => (
            <Polyline
              key={route.id}
              positions={route.path}
              pathOptions={{
                color: ROUTE_COLORS[route.mode],
                weight: route.mode === "flight" ? 1.25 : 2.5,
                opacity: route.mode === "flight" ? 0.85 : 0.95,
              }}
            >
              <Tooltip sticky>
                <span className="capitalize">{route.mode}</span>: {route.from} →{" "}
                {route.to} ({route.date})
              </Tooltip>
              <Popup>
                <strong className="capitalize">{route.mode}</strong>
                <br />
                {route.from} → {route.to}
                <br />
                {route.date}
              </Popup>
            </Polyline>
          ))}

          {activeJourney ? (
            <JourneyFollow
              key={`${activeJourney.id}-${playGeneration}`}
              route={activeJourney}
              paused={playbackPaused}
              speed={playbackSpeedMultiplier(playbackSpeed)}
              userZoomRef={userFollowZoomRef}
              cameraStateRef={followCameraRef}
              onComplete={handleJourneyComplete}
            />
          ) : null}

          <FitRoutesWhenComplete
            routes={visibleRoutes}
            enabled={status === "ready" && playbackFinished}
          />

          {visibleBookmarks.map((bookmark) => (
            <CircleMarker
              key={bookmark.id}
              center={[bookmark.lat, bookmark.lng]}
              radius={4}
              pathOptions={{
                color: "#f8fafc",
                fillColor: "#0ea5e9",
                fillOpacity: 0.85,
                weight: 1,
              }}
            >
              <Tooltip sticky>
                {bookmark.name}
                {bookmark.date ? ` · ${bookmark.date}` : ""}
              </Tooltip>
              <Popup>
                {bookmark.name}
                {bookmark.date ? (
                  <>
                    <br />
                    {bookmark.date}
                  </>
                ) : null}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {status === "ready" ? (
        <TravelStats
          stats={statsSummary}
          countriesByYear={countriesByYear}
          rangeLabel={rangeLabel}
          asOfLabel={asOfLabel}
        />
      ) : null}
    </div>
  );
}
