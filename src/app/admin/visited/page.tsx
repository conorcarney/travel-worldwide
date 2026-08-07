import type { Metadata } from "next";
import { VisitedAdmin } from "@/components/admin/VisitedAdmin";

export const metadata: Metadata = {
  title: "Visited countries",
};

export default function VisitedAdminPage() {
  return (
    <main className="flex flex-1 flex-col">
      <VisitedAdmin />
    </main>
  );
}
