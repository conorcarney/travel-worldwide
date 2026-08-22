"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { OPENFREEMAP_STYLE } from "@/lib/map/basemap";

/** Required for MapLibre v6 under Next.js / Turbopack — without it, no tiles load. */
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

/** Vector basemap from OpenFreeMap (MapLibre inside Leaflet). */
export function OpenFreeMapLayer() {
  const map = useMap();

  useEffect(() => {
    // Default padding is 0.1 — too little for wide viewports and chase-cam
    // CSS transforms, which leaves grey strips at the sides.
    const layer = maplibreGL({
      style: OPENFREEMAP_STYLE,
      padding: 0.75,
    });
    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map]);

  return null;
}
