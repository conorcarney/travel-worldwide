import type { Metadata } from "next";
import { MapView } from "@/components/map/MapView";

export const metadata: Metadata = {
  title: "Map",
};

export default function MapPage() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-border bg-surface px-4 py-3 sm:px-6">
        <h1 className="font-display text-xl text-foreground">Map</h1>
        <p className="text-sm text-muted">
          Toggle layers and filter by year. Hover routes or bookmarks for
          details.
        </p>
      </div>
      <MapView />
    </main>
  );
}
