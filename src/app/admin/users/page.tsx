import type { Metadata } from "next";
import { UsersAdmin } from "@/components/admin/UsersAdmin";

export const metadata: Metadata = {
  title: "Users admin",
};

export default function UsersAdminPage() {
  return (
    <main className="flex flex-1 flex-col">
      <UsersAdmin />
    </main>
  );
}
