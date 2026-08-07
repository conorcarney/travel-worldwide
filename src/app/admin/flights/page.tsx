import type { Metadata } from "next";
import { FlightsAdmin } from "@/components/admin/FlightsAdmin";

export const metadata: Metadata = {
  title: "Flights admin",
};

export default function FlightsAdminPage() {
  return (
    <main className="flex flex-1 flex-col">
      <FlightsAdmin />
    </main>
  );
}
