import type { Metadata } from "next";
import { CountryRatingsAdmin } from "@/components/admin/CountryRatingsAdmin";

export const metadata: Metadata = {
  title: "Country ratings",
};

export default function CountryRatingsAdminPage() {
  return (
    <main className="flex flex-1 flex-col">
      <CountryRatingsAdmin />
    </main>
  );
}
