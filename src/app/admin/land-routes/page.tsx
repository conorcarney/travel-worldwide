import type { Metadata } from "next";
import { LandRoutesAdmin } from "@/components/admin/LandRoutesAdmin";

export const metadata: Metadata = {
  title: "Land routes admin",
};

export default function LandRoutesAdminPage() {
  return (
    <main className="flex flex-1 flex-col">
      <LandRoutesAdmin />
    </main>
  );
}
