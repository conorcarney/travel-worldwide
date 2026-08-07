import type { Metadata } from "next";
import { BlogsAdmin } from "@/components/admin/BlogsAdmin";

export const metadata: Metadata = {
  title: "Blogs admin",
};

export default function BlogsAdminPage() {
  return (
    <main className="flex flex-1 flex-col">
      <BlogsAdmin />
    </main>
  );
}
