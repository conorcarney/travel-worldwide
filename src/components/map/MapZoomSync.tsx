"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

type MapZoomSyncProps = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
};

/** Keeps Leaflet zoom and React/URL zoom state in sync. */
export function MapZoomSync({ zoom, onZoomChange }: MapZoomSyncProps) {
  const map = useMap();
  const applyingRef = useRef(false);
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;

  useEffect(() => {
    const current = map.getZoom();
    if (Math.abs(current - zoom) < 0.05) return;
    applyingRef.current = true;
    map.setZoom(zoom, { animate: false });
  }, [map, zoom]);

  useEffect(() => {
    const onZoomEnd = () => {
      if (applyingRef.current) {
        applyingRef.current = false;
      }
      const next = Math.round(map.getZoom());
      onZoomChangeRef.current(next);
    };
    map.on("zoomend", onZoomEnd);
    return () => {
      map.off("zoomend", onZoomEnd);
    };
  }, [map]);

  return null;
}
