"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import type {
  GeoJSON as LeafletGeoJSON,
  Layer,
  LeafletMouseEvent,
  Path,
  PathOptions,
} from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { trackMapBlogClick } from "@/lib/analytics";
import {
  blogsForCountryFeature,
  countryBaseStyle,
  countryDisplayName,
  countryHoverStyle,
  featureCountryStatus,
  type CountryFeatureCollection,
} from "@/lib/map/countries";
import type { MongoBlog } from "@/lib/validations/map-data";

type VisitedCountriesLayerProps = {
  countries: CountryFeatureCollection;
  visitedNames: Set<string>;
  blogCountryNames: Set<string>;
  blogs: MongoBlog[];
};

const COUNTRIES_PANE = "countriesPane";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function blogPopupHtml(country: string, blogs: MongoBlog[]): string {
  const links = blogs
    .flatMap((blog) => {
      const slug = blog.url?.trim();
      if (!slug) return [];
      const title = escapeHtml(blog.blog_title?.trim() || slug);
      return [
        `<a class="map-blog-link" href="/blogs/${encodeURIComponent(slug)}" data-blog-slug="${escapeHtml(slug)}" data-blog-title="${title}" data-blog-country="${escapeHtml(country)}">${title}</a>`,
      ];
    })
    .join("");
  return `<div><strong>${escapeHtml(country)}</strong>${links}</div>`;
}

function InvalidateSizeOnMount() {
  const map = useMap();
  useLayoutEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

function CountriesPane() {
  const map = useMap();
  useLayoutEffect(() => {
    const existing = map.getPane(COUNTRIES_PANE);
    const pane = existing ?? map.createPane(COUNTRIES_PANE);
    // Below overlayPane (400) so route lines and hover tooltips stay on top.
    pane.style.zIndex = "350";
  }, [map]);
  return null;
}

export function VisitedCountriesLayer({
  countries,
  visitedNames,
  blogCountryNames,
  blogs,
}: VisitedCountriesLayerProps) {
  const map = useMap();
  if (!map.getPane(COUNTRIES_PANE)) {
    map.createPane(COUNTRIES_PANE).style.zIndex = "350";
  }
  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);
  const namesRef = useRef({ visitedNames, blogCountryNames, blogs });
  namesRef.current = { visitedNames, blogCountryNames, blogs };
  const data = countries as FeatureCollection<Geometry>;
  const renderer = useMemo(
    () => L.canvas({ padding: 0.5, pane: COUNTRIES_PANE }),
    [],
  );
  const fillKey = `${[...visitedNames].join("|")}::${[...blogCountryNames].join("|")}`;

  function style(feature?: Feature): PathOptions {
    const names = namesRef.current;
    return {
      ...countryBaseStyle(
        featureCountryStatus(
          feature?.properties as Record<string, unknown> | undefined,
          names.visitedNames,
          names.blogCountryNames,
        ),
      ),
      renderer,
    };
  }

  useEffect(() => {
    const layer = geoJsonRef.current;
    if (!layer) return;
    layer.options.style = style;
    layer.resetStyle();
  }, [fillKey]);

  function onEachFeature(feature: Feature, layer: Layer) {
    const pathLayer = layer as Path & { feature?: Feature };
    const posts = () =>
      blogsForCountryFeature(
        (pathLayer.feature ?? feature).properties as
          | Record<string, unknown>
          | undefined,
        namesRef.current.blogs,
      );

    layer.on("add", () => {
      const element = pathLayer.getElement?.();
      if (element && posts().length > 0) {
        element.style.cursor = "pointer";
      }
    });

    layer.on("click", (event: LeafletMouseEvent) => {
      const current = posts();
      if (current.length === 0) return;
      const properties = (pathLayer.feature ?? feature).properties as
        | Record<string, unknown>
        | undefined;
      const country = countryDisplayName(properties);
      pathLayer
        .bindPopup(blogPopupHtml(country, current), {
          maxWidth: 280,
          className: "map-blog-popup",
        })
        .openPopup(event.latlng);
    });

    layer.on("popupopen", () => {
      const root = layer.getPopup()?.getElement();
      root
        ?.querySelectorAll<HTMLAnchorElement>("a[data-blog-slug]")
        .forEach((link) => {
          if (link.dataset.gaBound === "1") return;
          link.dataset.gaBound = "1";
          L.DomEvent.on(link, "click", () => {
            trackMapBlogClick({
              slug: link.dataset.blogSlug ?? "",
              title: link.dataset.blogTitle ?? "",
              country: link.dataset.blogCountry ?? "",
            });
          });
        });
    });

    layer.on({
      mouseover: (event: LeafletMouseEvent) => {
        const target = event.target as LeafletGeoJSON & {
          feature?: Feature;
        };
        const names = namesRef.current;
        const status = featureCountryStatus(
          target.feature?.properties as Record<string, unknown> | undefined,
          names.visitedNames,
          names.blogCountryNames,
        );
        target.setStyle(countryHoverStyle(status));
        if (typeof target.bringToFront === "function") {
          target.bringToFront();
        }
        map.getContainer().style.cursor =
          posts().length > 0 ? "pointer" : "";
      },
      mouseout: (event: LeafletMouseEvent) => {
        geoJsonRef.current?.resetStyle(event.target);
        map.getContainer().style.cursor = "";
      },
    });
  }

  return (
    <>
      <CountriesPane />
      <InvalidateSizeOnMount />
      <GeoJSON
        ref={geoJsonRef}
        key={`countries-${countries.features.length}`}
        data={data}
        pane={COUNTRIES_PANE}
        style={style}
        onEachFeature={onEachFeature}
      />
    </>
  );
}
