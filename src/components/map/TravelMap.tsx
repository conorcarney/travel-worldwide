"use client";

import { startTransition, useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  Polyline,
  TileLayer,
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
import { filterByYearRange, getYearBounds } from "@/lib/map/years";
import { summarizeTravelStats } from "@/lib/map/distance";
import type {
  MapBookmark,
  MapRoute,
  MongoBlog,
  MongoVisited,
} from "@/lib/validations/map-data";
import {
  MapControls,
  type LayerVisibility,
} from "@/components/map/MapControls";
import { MapLoadingSpinner } from "@/components/map/MapLoadingSpinner";
import { TravelStats } from "@/components/map/TravelStats";
import { VisitedCountriesLayer } from "@/components/map/VisitedCountriesLayer";

type MapStatus = "loading" | "ready" | "error";

const DEFAULT_LAYERS: LayerVisibility = {
  visited: true,
  flight: true,
  ferry: true,
  bus: true,
  train: true,
  car: true,
  bookmarks: true,
};

export default function TravelMap() {
  const [status, setStatus] = useState<MapStatus>("loading");
  const [source, setSource] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<MapRoute[]>([]);
  const [bookmarks, setBookmarks] = useState<MapBookmark[]>([]);
  const [visited, setVisited] = useState<MongoVisited[]>([]);
  const [blogs, setBlogs] = useState<MongoBlog[]>([]);
  const [countries, setCountries] = useState<CountryFeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS);
  const [yearMin, setYearMin] = useState(2000);
  const [yearMax, setYearMax] = useState(2027);
  const [yearStart, setYearStart] = useState(2000);
  const [yearEnd, setYearEnd] = useState(2027);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [
          visitedRes,
          flightsRes,
          surfaceRes,
          bookmarksRes,
          countryListRes,
          blogsRes,
        ] = await Promise.all([
          fetchApiList("/api/visited"),
          fetchApiList("/api/flights"),
          fetchApiList("/api/buses-trains-ferries"),
          fetchApiList("/api/maps-me-bookmarks"),
          fetchApiList("/api/country-list"),
          fetchApiList("/api/blogs"),
        ]);

        if (cancelled) return;

        const failed = [
          visitedRes,
          flightsRes,
          surfaceRes,
          bookmarksRes,
          countryListRes,
          blogsRes,
        ].find((res) => !res.ok);
        if (failed) {
          setStatus("error");
          setError(failed.error ?? "Failed to load map data");
          return;
        }

        const flightRoutes = normalizeFlights(flightsRes.data ?? []);
        const surfaceRoutes = normalizeSurfaceRoutes(surfaceRes.data ?? []);
        console.log("Land transport data", {
          raw: surfaceRes.data,
          source: surfaceRes.source,
          normalized: surfaceRoutes,
        });
        const allRoutes = [...flightRoutes, ...surfaceRoutes];
        const mapBookmarks = normalizeBookmarks(bookmarksRes.data ?? []);
        const visitedCountries = normalizeVisited(visitedRes.data ?? []);
        const blogPosts = normalizeBlogs(blogsRes.data ?? []);
        const countryGeo = normalizeCountryList(countryListRes.data ?? []);

        const bounds = getYearBounds([
          ...allRoutes.map((route) => route.date),
          ...mapBookmarks.map((bookmark) => bookmark.date),
        ]);

        setVisited(visitedCountries);
        setBlogs(blogPosts);
        setRoutes(allRoutes);
        setBookmarks(mapBookmarks);
        setCountries(countryGeo);
        setYearMin(bounds.min);
        setYearMax(bounds.max);
        setYearStart(bounds.min);
        setYearEnd(bounds.max);
        setSource(flightsRes.source ?? visitedRes.source ?? "unknown");
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to load map");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visitedNames = visitedNameSet(visited);
  const blogCountryNames = blogCountryNameSet(blogs);
  const yearFilteredRoutes = filterByYearRange(routes, yearStart, yearEnd);
  const filteredRoutes = yearFilteredRoutes.filter(
    (route) => layers[route.mode],
  );
  const filteredBookmarks = layers.bookmarks
    ? filterByYearRange(bookmarks, yearStart, yearEnd)
    : [];
  const travelStats = summarizeTravelStats(yearFilteredRoutes);

  function toggleLayer(key: keyof LayerVisibility) {
    setLayers((current) => ({ ...current, [key]: !current[key] }));
  }

  function updateYearStart(year: number) {
    startTransition(() => {
      setYearStart(Math.min(year, yearEnd));
    });
  }

  function updateYearEnd(year: number) {
    startTransition(() => {
      setYearEnd(Math.max(year, yearStart));
    });
  }

  return (
    <div className="relative flex flex-1 flex-col" data-testid="travel-map">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-2 text-xs text-muted sm:px-6">
        <span
          className="inline-flex items-center gap-2"
          data-testid="map-status"
        >
          {status === "loading" ? (
            <>
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border border-muted border-t-accent"
                aria-hidden
              />
              Loading map data…
            </>
          ) : null}
          {status === "ready" &&
            `Ready · ${source} · ${visited.length} visited · ${routes.length} routes · ${bookmarks.length} bookmarks`}
          {status === "error" && `Error: ${error}`}
        </span>
      </div>

      {status === "ready" ? (
        <MapControls
          layers={layers}
          onToggleLayer={toggleLayer}
          yearStart={yearStart}
          yearEnd={yearEnd}
          yearMin={yearMin}
          yearMax={yearMax}
          onYearStartChange={updateYearStart}
          onYearEndChange={updateYearEnd}
          visibleCounts={{
            visited: layers.visited ? visitedNames.size : 0,
            routes: filteredRoutes.length,
            bookmarks: filteredBookmarks.length,
          }}
        />
      ) : null}

      <div className="relative min-h-[60vh] flex-1" data-testid="leaflet-root">
        {status === "loading" ? <MapLoadingSpinner overlay /> : null}
        <MapContainer
          center={[20, 0]}
          zoom={2}
          className="h-full min-h-[60vh] w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {layers.visited && countries.features.length > 0 ? (
            <VisitedCountriesLayer
              countries={countries}
              visitedNames={visitedNames}
              blogCountryNames={blogCountryNames}
            />
          ) : null}

          {filteredRoutes.map((route) => (
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

          {filteredBookmarks.map((bookmark) => (
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
          stats={travelStats}
          yearStart={yearStart}
          yearEnd={yearEnd}
        />
      ) : null}
    </div>
  );
}
