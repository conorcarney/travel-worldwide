"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import {
  FOLLOW_PITCH_DEG,
  bridgeDurationMs,
  easeInOutCubic,
  expSmoothAngle,
  expSmoothLatLng,
  followCameraTarget,
  followZoom,
  headingPaneTransform,
  hasRouteTag,
  interpolateJourney,
  journeyDurationMs,
  lerpAngle,
  lerpLatLng,
  rotationTilePadRatio,
  vehicleFollowTransform,
  type FollowCameraState,
} from "@/lib/map/journey";
import { ROUTE_COLORS } from "@/lib/map/normalize";
import { vehicleIconHtml } from "@/lib/map/vehicle-icons";
import type { MapRoute } from "@/lib/validations/map-data";

const FLY_SECONDS = 0.55;
const ARRIVAL_HOLD_MS = 160;

function isMapUsable(map: L.Map): boolean {
  try {
    const container = map.getContainer();
    return Boolean(container?.isConnected);
  } catch {
    return false;
  }
}

function applyMapHeading(map: L.Map, bearing: number, pitch = 0) {
  const pane = map.getPane("mapPane");
  if (!pane) return;
  const pos = L.DomUtil.getPosition(pane);
  const size = map.getSize();
  if (!pos || !size) return;
  const container = map.getContainer();
  if (pitch > 0) {
    container.classList.add("travel-follow-3d");
  } else {
    container.classList.remove("travel-follow-3d");
  }
  pane.style.transform = headingPaneTransform(pos, size, bearing, pitch);
}

function resetMapHeading(map: L.Map) {
  const pane = map.getPane("mapPane");
  if (!pane) return;
  const pos = L.DomUtil.getPosition(pane);
  if (!pos) return;
  map.getContainer().classList.remove("travel-follow-3d");
  L.DomUtil.setPosition(pane, pos);
}

function safeRemove(layer: { remove: () => void }) {
  try {
    layer.remove();
  } catch {
    // Map already unmounted.
  }
}

type JourneyFollowProps = {
  route: MapRoute;
  paused?: boolean;
  speed?: number;
  userZoomRef?: MutableRefObject<number | null>;
  cameraStateRef?: MutableRefObject<FollowCameraState | null>;
  onComplete: (routeId: string) => void;
};

export function JourneyFollow({
  route,
  paused = false,
  speed = 1,
  userZoomRef,
  cameraStateRef,
  onComplete,
}: JourneyFollowProps) {
  const map = useMap();
  const onCompleteRef = useRef(onComplete);
  const pausedRef = useRef(paused);
  const speedRef = useRef(speed);
  const resumeTickRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    pausedRef.current = paused;
    if (!paused) {
      resumeTickRef.current?.();
    }
  }, [paused]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    let cancelled = false;
    let finished = false;
    let raf = 0;
    let flyFallback = 0;
    let arrivalHold = 0;
    let started = false;
    let startTime = 0;
    let pauseStartedAt = 0;
    let pausedMs = 0;
let lastMapPan = 0;
    const complete = () => {
      if (cancelled || finished) return;
      finished = true;
      onCompleteRef.current(route.id);
    };

    const path = route.path;
    if (path.length < 2) {
      const timer = window.setTimeout(complete, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }

    const color = ROUTE_COLORS[route.mode];
    const start = L.latLng(path[0]![0], path[0]![1]);
    const bounds = L.latLngBounds(
      path.map(([lat, lng]) => L.latLng(lat, lng)),
    );
    const initialSample = interpolateJourney(path, 0);
    const flightZoomOut =
      route.mode === "flight" && hasRouteTag(route.tags, "Long distance")
        ? 8
        : 0;
    let zoom = followZoom(Number.NaN, flightZoomOut);
    try {
      if (isMapUsable(map)) {
        zoom =
          userZoomRef?.current ??
          followZoom(
            map.getBoundsZoom(bounds, false, L.point(72, 72)),
            flightZoomOut,
          );
      }
    } catch {
      zoom = userZoomRef?.current ?? followZoom(Number.NaN, flightZoomOut);
    }

    const vehiclePaneName = "vehiclePane";
    try {
      if (isMapUsable(map) && !map.getPane(vehiclePaneName)) {
        const pane = map.createPane(vehiclePaneName);
        pane.style.zIndex = "680";
        pane.style.overflow = "visible";
      }
    } catch {
      // Map already unmounted.
    }

    const marker = L.marker(start, {
      icon: L.divIcon({
        className: "travel-vehicle-icon",
        iconSize: [72, 72],
        iconAnchor: [36, 36],
        html: vehicleIconHtml(
          route.mode,
          initialSample.bearing,
          color,
          FOLLOW_PITCH_DEG,
        ),
      }),
      pane: vehiclePaneName,
      interactive: false,
      keyboard: false,
      zIndexOffset: 4000,
    });
    const trail = L.polyline([start], {
      color,
      weight: route.mode === "flight" ? 1.25 : 2.5,
      opacity: route.mode === "flight" ? 0.85 : 0.95,
      interactive: false,
    });

    try {
      if (isMapUsable(map)) {
        marker.addTo(map);
        trail.addTo(map);
      } else {
        return () => {
          cancelled = true;
        };
      }
    } catch {
      return () => {
        cancelled = true;
      };
    }

    const initialBearing = initialSample.bearing;
    const previousCamera = cameraStateRef?.current ?? null;
    let lastSpeed = speedRef.current;
    let lastTickAt = 0;
    let cameraPos = previousCamera?.position ?? initialSample.position;
    let cameraBearing = previousCamera?.bearing ?? 0;
    let programmaticView = false;
    let userZooming = false;
    const isFlight = route.mode === "flight";
    const positionTauMs = isFlight ? 110 : 55;
    const headingTauMs = isFlight ? 260 : 90;
    const tangentSpan = isFlight ? 0.12 : 0.05;

    const saveCamera = () => {
      if (!cameraStateRef) return;
      cameraStateRef.current = {
        position: cameraPos,
        bearing: cameraBearing,
      };
    };

    const currentDuration = () =>
      journeyDurationMs(route.distanceKm, speedRef.current);

    const faceTravel = (bearing: number, pitch = FOLLOW_PITCH_DEG) => {
      try {
        applyMapHeading(map, bearing, pitch);
      } catch {
        // Map already unmounted.
      }
    };

    const faceVehicle = (bearing: number, pitch = FOLLOW_PITCH_DEG) => {
      const inner = marker
        .getElement()
        ?.querySelector<HTMLElement>(".travel-vehicle-icon-inner");
      if (inner) {
        inner.style.transform = vehicleFollowTransform(bearing, pitch);
      }
    };

    const rememberUserZoom = () => {
      if (!isMapUsable(map)) {
        userZooming = false;
        return;
      }
      if (!programmaticView) {
        const nextZoom = map.getZoom();
        zoom = nextZoom;
        if (userZoomRef) {
          userZoomRef.current = nextZoom;
        }
      }
      userZooming = false;
      if (started && !finished && !pausedRef.current) {
        window.cancelAnimationFrame(raf);
        raf = window.requestAnimationFrame(tick);
      }
    };

    const onUserZoomIntent = () => {
      userZooming = true;
      programmaticView = false;
      if (!started) {
        try {
          map.stop();
        } catch {
          // Map already unmounted.
        }
      }
    };

    const tick = (now: number) => {
      if (cancelled || !isMapUsable(map)) return;

      if (pausedRef.current) {
        if (!pauseStartedAt) pauseStartedAt = now;
        return;
      }
      if (pauseStartedAt) {
        pausedMs += now - pauseStartedAt;
        pauseStartedAt = 0;
        lastTickAt = 0;
      }

      if (speedRef.current !== lastSpeed) {
        const previous = journeyDurationMs(route.distanceKm, lastSpeed);
        const progress = Math.min(1, (now - startTime - pausedMs) / previous);
        lastSpeed = speedRef.current;
        startTime = now - progress * currentDuration() - pausedMs;
      }

      const t = Math.min(1, (now - startTime - pausedMs) / currentDuration());
      const target = followCameraTarget(path, t, tangentSpan);
      const dt = lastTickAt === 0 ? 16 : Math.min(48, now - lastTickAt);
      lastTickAt = now;
      cameraPos = expSmoothLatLng(cameraPos, target.position, dt, positionTauMs);
      cameraBearing = expSmoothAngle(
        cameraBearing,
        target.bearing,
        dt,
        headingTauMs,
      );

      try {
        marker.setLatLng(target.position);
        faceVehicle(cameraBearing);
        trail.setLatLngs(target.traveled);
        if (!userZooming) {
          programmaticView = true;
          if (now - lastMapPan >= 30) {
            map.panTo(cameraPos, {
              animate: false,
              noMoveStart: true,
            });
            lastMapPan = now;
          }
          programmaticView = false;
          faceTravel(cameraBearing);
        }
        saveCamera();
      } catch {
        programmaticView = false;
      }

      if (t < 1) {
        raf = window.requestAnimationFrame(tick);
        return;
      }

      arrivalHold = window.setTimeout(
        complete,
        ARRIVAL_HOLD_MS / Math.max(speedRef.current, 0.25),
      );
    };

    const applyCamera = (position: [number, number], bearing: number) => {
      cameraPos = position;
      cameraBearing = bearing;
      programmaticView = true;
      if (previousCamera || userZoomRef?.current != null) {
        map.panTo(position, { animate: false, noMoveStart: true });
      } else {
        map.setView(position, zoom, { animate: false });
      }
      programmaticView = false;
      faceTravel(bearing);
      marker.setLatLng(initialSample.position);
      faceVehicle(bearing);
      saveCamera();
    };

    const startTravel = () => {
      if (cancelled || started) return;
      if (pausedRef.current) return;
      started = true;
      programmaticView = false;
      window.clearTimeout(flyFallback);
      try {
        if (isMapUsable(map)) {
          map.off("move", onFlyMove);
        }
      } catch {
        // Map already unmounted.
      }
      startTime = performance.now();
      lastTickAt = 0;
      raf = window.requestAnimationFrame(tick);
    };

    let bridgeStart = 0;
    let bridgePausedMs = 0;
    const fromPos = previousCamera?.position ?? cameraPos;
    const fromBearing = previousCamera?.bearing ?? 0;
    const bridgeMs = previousCamera
      ? bridgeDurationMs(speedRef.current)
      : Math.round(
          (FLY_SECONDS * 1000) / Math.max(speedRef.current, 0.25),
        );

    const bridgeTick = (now: number) => {
      if (cancelled || started || !isMapUsable(map)) return;
      if (pausedRef.current) {
        if (!pauseStartedAt) pauseStartedAt = now;
        return;
      }
      if (pauseStartedAt) {
        bridgePausedMs += now - pauseStartedAt;
        pauseStartedAt = 0;
      }
      if (!bridgeStart) bridgeStart = now;
      const raw = Math.min(1, (now - bridgeStart - bridgePausedMs) / bridgeMs);
      const u = easeInOutCubic(raw);
      applyCamera(
        lerpLatLng(fromPos, initialSample.position, u),
        lerpAngle(fromBearing, initialBearing, u),
      );
      if (raw < 1) {
        raf = window.requestAnimationFrame(bridgeTick);
        return;
      }
      startTravel();
    };

    const onFlyMove = () => {
      if (cancelled || started || !isMapUsable(map)) return;
      const now = performance.now();
      if (!bridgeStart) bridgeStart = now;
      const raw = Math.min(1, (now - bridgeStart - bridgePausedMs) / bridgeMs);
      const u = easeInOutCubic(raw);
      const pitch = previousCamera
        ? FOLLOW_PITCH_DEG
        : FOLLOW_PITCH_DEG * u;
      const heading = lerpAngle(fromBearing, initialBearing, u);
      faceTravel(heading, pitch);
      faceVehicle(heading, pitch);
    };

    resumeTickRef.current = () => {
      if (cancelled || finished) return;
      window.cancelAnimationFrame(raf);
      if (started) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      if (previousCamera) {
        raf = window.requestAnimationFrame(bridgeTick);
      }
    };

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const onZoomStart = () => {
      if (programmaticView) return;
      onUserZoomIntent();
    };

    const container = isMapUsable(map) ? map.getContainer() : null;
    const zoomControl = container?.querySelector(".leaflet-control-zoom");
    container?.addEventListener("wheel", onUserZoomIntent, { passive: true });
    container?.addEventListener("dblclick", onUserZoomIntent);
    zoomControl?.addEventListener("click", onUserZoomIntent);
    map.on("zoomstart", onZoomStart);
    map.on("zoomend", rememberUserZoom);

    if (reducedMotion) {
      try {
        if (isMapUsable(map)) {
          programmaticView = true;
          map.setView(start, zoom, { animate: false });
          programmaticView = false;
          faceTravel(initialBearing, 0);
          faceVehicle(initialBearing, 0);
        }
        trail.setLatLngs(path);
        const end = path[path.length - 1]!;
        marker.setLatLng(end);
      } catch {
        programmaticView = false;
      }
      arrivalHold = window.setTimeout(complete, 350);
    } else if (previousCamera) {
      faceTravel(fromBearing);
      raf = window.requestAnimationFrame(bridgeTick);
    } else {
      const flySeconds = FLY_SECONDS / Math.max(speedRef.current, 0.25);
      try {
        if (isMapUsable(map)) {
          map.on("move", onFlyMove);
          map.once("moveend", startTravel);
          programmaticView = true;
          if (userZoomRef?.current != null) {
            map.panTo(start, { animate: true, duration: flySeconds });
          } else {
            map.flyTo(start, zoom, { duration: flySeconds });
          }
          faceTravel(fromBearing, 0);
          faceVehicle(fromBearing, 0);
        } else {
          startTravel();
        }
      } catch {
        programmaticView = false;
        startTravel();
      }
      flyFallback = window.setTimeout(
        startTravel,
        Math.max(400, flySeconds * 1000 + 200),
      );
    }

    return () => {
      cancelled = true;
      resumeTickRef.current = null;
      saveCamera();
      window.cancelAnimationFrame(raf);
      window.clearTimeout(flyFallback);
      window.clearTimeout(arrivalHold);
      container?.removeEventListener("wheel", onUserZoomIntent);
      container?.removeEventListener("dblclick", onUserZoomIntent);
      zoomControl?.removeEventListener("click", onUserZoomIntent);
      try {
        if (isMapUsable(map)) {
          map.off("zoomend", rememberUserZoom);
          map.off("zoomstart", onZoomStart);
          map.off("move", onFlyMove);
          map.off("moveend", startTravel);
          map.stop();
        }
      } catch {
        // Map already unmounted.
      }
      safeRemove(marker);
      safeRemove(trail);
    };
  }, [map, route, userZoomRef, cameraStateRef]);

  return null;
}

type FitRoutesWhenCompleteProps = {
  routes: MapRoute[];
  enabled: boolean;
};

export function FitRoutesWhenComplete({
  routes,
  enabled,
}: FitRoutesWhenCompleteProps) {
  const map = useMap();
  const fittedFor = useRef("");

  useEffect(() => {
    if (!enabled) {
      fittedFor.current = "";
      return;
    }
    if (routes.length === 0 || !isMapUsable(map)) return;

    const key = routes.map((route) => route.id).join(",");
    if (fittedFor.current === key) return;
    fittedFor.current = key;

    const bounds = L.latLngBounds(
      routes.flatMap((route) =>
        route.path.map(([lat, lng]) => L.latLng(lat, lng)),
      ),
    );
    if (!bounds.isValid()) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    try {
      resetMapHeading(map);
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 5,
        animate: !reducedMotion,
        duration: 0.8,
      });
    } catch {
      // Map already unmounted.
    }
  }, [enabled, routes, map]);

  return null;
}

type PaddedGridLayer = L.GridLayer & {
  _getTiledPixelBounds: (center: L.LatLng) => L.Bounds;
};

/** Fetch extra OSM tiles around the viewport so rotation does not show grey corners. */
export function CoverRotatedViewport({ active = false }: { active?: boolean }) {
  const map = useMap();
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!isMapUsable(map)) return;

    const originals = new Map<
      L.GridLayer,
      PaddedGridLayer["_getTiledPixelBounds"]
    >();

    const padRatio = () => 0.5
      // activeRef.current
      //   ? rotationTilePadRatio(map.getSize(), FOLLOW_PITCH_DEG)
      //   : 0;

    const patch = (layer: L.Layer) => {
      if (!(layer instanceof L.GridLayer) || originals.has(layer)) return;
      const tiled = layer as PaddedGridLayer;
      if (typeof tiled._getTiledPixelBounds !== "function") return;
      const original = tiled._getTiledPixelBounds;
      originals.set(layer, original);
      tiled._getTiledPixelBounds = function (
        this: L.GridLayer,
        center: L.LatLng,
      ) {
        const extra = padRatio();
        const bounds = original.call(this, center);
        return extra > 0 ? bounds.pad(extra) : bounds;
      };
    };

    map.eachLayer(patch);
    const onLayerAdd = (event: L.LayerEvent) => patch(event.layer);
    map.on("layeradd", onLayerAdd);

    return () => {
      map.off("layeradd", onLayerAdd);
      map.eachLayer((layer) => {
        if (!(layer instanceof L.GridLayer)) return;
        const original = originals.get(layer);
        if (!original) return;
        (layer as PaddedGridLayer)._getTiledPixelBounds = original;
      });
    };
  }, [map]);

  useEffect(() => {
    if (!active || !isMapUsable(map)) return;
    map.eachLayer((layer) => {
      if (layer instanceof L.GridLayer) layer.redraw();
    });
  }, [active, map]);

  return null;
}
