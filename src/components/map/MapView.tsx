"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { MapLoadingSpinner } from "@/components/map/MapLoadingSpinner";

const TravelMap = dynamic(() => import("@/components/map/TravelMap"), {
  ssr: false,
  loading: () => <MapLoadingSpinner label="Loading map…" />,
});

export function MapView() {
  return (
    <Suspense fallback={<MapLoadingSpinner label="Loading map…" />}>
      <TravelMap />
    </Suspense>
  );
}
