import type { Metadata } from "next";
import { PassatBorderCrossingsAdmin } from "@/components/admin/PassatBorderCrossingsAdmin";

export const metadata: Metadata = {
  title: "Passat border crossings",
};

export default function PassatBorderCrossingsAdminPage() {
  return (
    <main className="flex flex-1 flex-col">
      <PassatBorderCrossingsAdmin />
    </main>
  );
}
