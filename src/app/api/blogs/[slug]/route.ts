import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminSession } from "@/lib/authz";
import { readAuthSession } from "@/lib/auth-session";
import { handleStoreAction } from "@/lib/api/admin-handler";
import { loadBlogBySlug } from "@/lib/blog-pages";
import { isMongoConfigured } from "@/lib/mongodb";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  return handleStoreAction("Failed to load blog", async () => {
    const { slug } = await context.params;
    const session = await readAuthSession(() => auth());
    const blog = await loadBlogBySlug(slug, {
      allowUnlisted: isAdminSession(session),
    });

    if (!blog) {
      return NextResponse.json(
        { ok: false, error: "Blog not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      source: isMongoConfigured() ? "mongodb" : "fixtures",
      data: blog,
    });
  });
}
