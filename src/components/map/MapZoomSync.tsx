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
  const userInitiatedRef = useRef(false);
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;

  useEffect(() => {
    const current = map.getZoom();
    if (Math.abs(current - zoom) < 0.05) return;
    applyingRef.current = true;
    map.setZoom(zoom, { animate: false });
  }, [map, zoom]);

  useEffect(() => {
    const container = map.getContainer();

    const markUserZoom = () => {
      userInitiatedRef.current = true;
    };

    const onZoomStart = (event: { originalEvent?: Event }) => {
      if (event.originalEvent) {
        userInitiatedRef.current = true;
      }
    };

    const onZoomEnd = () => {
      if (applyingRef.current) {
        applyingRef.current = false;
        userInitiatedRef.current = false;
        return;
      }
      if (!userInitiatedRef.current) return;
      userInitiatedRef.current = false;
      const next = Math.round(map.getZoom());
      onZoomChangeRef.current(next);
    };

    container?.addEventListener("wheel", markUserZoom, { passive: true });
    container?.addEventListener("dblclick", markUserZoom);
    const zoomControl = container?.querySelector(".leaflet-control-zoom");
    zoomControl?.addEventListener("click", markUserZoom);
    map.on("zoomstart", onZoomStart);
    map.on("zoomend", onZoomEnd);

    return () => {
      container?.removeEventListener("wheel", markUserZoom);
      container?.removeEventListener("dblclick", markUserZoom);
      zoomControl?.removeEventListener("click", markUserZoom);
      map.off("zoomstart", onZoomStart);
      map.off("zoomend", onZoomEnd);
    };
  }, [map]);

  return null;
}
