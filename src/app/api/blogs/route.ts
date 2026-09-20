import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import {
  createAdminCreateHandler,
  handleStoreAction,
} from "@/lib/api/admin-handler";
import {
  blogWriteSchema,
  createBlog,
  listAllBlogs,
  listPublicBlogs,
} from "@/lib/blogs";
import { fixtures } from "@/lib/fixtures";
import { isMongoConfigured } from "@/lib/mongodb";

export async function GET(request: Request) {
  return handleStoreAction("Failed to load blogs", async () => {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");

    if (scope === "all") {
      const { error } = await requireAdminApi();
      if (error) return error;
    }

    if (!isMongoConfigured()) {
      const data = fixtures.blogs;
      return NextResponse.json({
        ok: true,
        source: "fixtures",
        data,
      });
    }

    const data =
      scope === "all" ? await listAllBlogs() : await listPublicBlogs();
    return NextResponse.json({ ok: true, source: "mongodb", data });
  });
}

export const POST = createAdminCreateHandler({
  schema: blogWriteSchema,
  invalidMessage: "Invalid blog",
  fallbackError: "Failed to create blog",
  create: createBlog,
});
