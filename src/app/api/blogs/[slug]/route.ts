import { NextResponse } from "next/server";
import { BlogStoreError, getBlogBySlug } from "@/lib/blogs";
import { fixtures } from "@/lib/fixtures";
import { isMongoConfigured } from "@/lib/mongodb";
import { isPublicBlog, type BlogRecord } from "@/lib/validations/blog-write";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;

    if (!isMongoConfigured()) {
      const match = (fixtures.blogs as BlogRecord[]).find(
        (blog) => blog.url === slug,
      );
      if (!match || !isPublicBlog(match)) {
        return NextResponse.json(
          { ok: false, error: "Blog not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, source: "fixtures", data: match });
    }

    const blog = await getBlogBySlug(slug);
    if (!blog || !isPublicBlog(blog)) {
      return NextResponse.json(
        { ok: false, error: "Blog not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, source: "mongodb", data: blog });
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
