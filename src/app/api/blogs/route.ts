import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import {
  BlogStoreError,
  blogWriteSchema,
  createBlog,
  listAllBlogs,
  listPublicBlogs,
} from "@/lib/blogs";
import { fixtures } from "@/lib/fixtures";
import { isMongoConfigured } from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
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
  } catch (error) {
    if (error instanceof BlogStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to load blogs";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body: unknown = await request.json();
    const parsed = blogWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid blog",
        },
        { status: 400 },
      );
    }

    const blog = await createBlog(parsed.data);
    return NextResponse.json({ ok: true, data: blog }, { status: 201 });
  } catch (error) {
    if (error instanceof BlogStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to create blog";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
