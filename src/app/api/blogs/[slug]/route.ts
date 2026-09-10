import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminSession } from "@/lib/authz";
import { loadBlogBySlug } from "@/lib/blog-pages";
import { BlogStoreError } from "@/lib/blogs";
import { isMongoConfigured } from "@/lib/mongodb";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const session = await auth();
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
  } catch (error) {
    if (error instanceof BlogStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to load blog";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
