import type { Metadata } from "next";
import { MapView } from "@/components/map/MapView";

export const metadata: Metadata = {
  title: "Map",
};

export default function MapPage() {
  return (
    <main className="flex flex-1 flex-col">
      <MapView />
    </main>
  );
}
