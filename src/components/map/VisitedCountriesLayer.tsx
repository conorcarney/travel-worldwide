"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import type {
  GeoJSON as LeafletGeoJSON,
  Layer,
  LeafletMouseEvent,
  PathOptions,
} from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  countryBaseStyle,
  countryHoverStyle,
  featureCountryStatus,
  type CountryFeatureCollection,
} from "@/lib/map/countries";

type VisitedCountriesLayerProps = {
  countries: CountryFeatureCollection;
  visitedNames: Set<string>;
  blogCountryNames: Set<string>;
};

const COUNTRIES_PANE = "countriesPane";

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
}: VisitedCountriesLayerProps) {
  const map = useMap();
  if (!map.getPane(COUNTRIES_PANE)) {
    map.createPane(COUNTRIES_PANE).style.zIndex = "350";
  }
  const geoJsonRef = useRef<LeafletGeoJSON | null>(null);
  const namesRef = useRef({ visitedNames, blogCountryNames });
  namesRef.current = { visitedNames, blogCountryNames };
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

  function onEachFeature(_feature: Feature, layer: Layer) {
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
      },
      mouseout: (event: LeafletMouseEvent) => {
        geoJsonRef.current?.resetStyle(event.target);
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
