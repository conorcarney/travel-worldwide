"use client";

import { useLayoutEffect, useRef } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import type {
  GeoJSON as LeafletGeoJSON,
  Layer,
  LeafletMouseEvent,
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
  const data = countries as FeatureCollection<Geometry>;

  function style(feature?: Feature) {
    const status = featureCountryStatus(
      feature?.properties as Record<string, unknown> | undefined,
      visitedNames,
      blogCountryNames,
    );
    return countryBaseStyle(status);
  }

  function onEachFeature(feature: Feature, layer: Layer) {
    const properties = feature.properties as Record<string, unknown> | undefined;
    const status = featureCountryStatus(
      properties,
      visitedNames,
      blogCountryNames,
    );

    layer.on({
      mouseover: (event: LeafletMouseEvent) => {
        const target = event.target as LeafletGeoJSON;
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
        key={`visited-${visitedNames.size}-${blogCountryNames.size}-${countries.features.length}`}
        data={data}
        pane={COUNTRIES_PANE}
        style={style}
        onEachFeature={onEachFeature}
      />
    </>
  );
}
