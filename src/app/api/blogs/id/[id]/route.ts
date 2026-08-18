import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import {
  BlogStoreError,
  blogWriteSchema,
  deleteBlog,
  updateBlog,
} from "@/lib/blogs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
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

    const blog = await updateBlog(id, parsed.data);
    return NextResponse.json({ ok: true, data: blog });
  } catch (error) {
    if (error instanceof BlogStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to update blog";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    await deleteBlog(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof BlogStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to delete blog";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
