import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import {
  deleteVisited,
  updateVisited,
  VisitedStoreError,
  visitedWriteSchema,
} from "@/lib/visited";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = visitedWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid visited country",
        },
        { status: 400 },
      );
    }

    const visited = await updateVisited(id, parsed.data);
    return NextResponse.json({ ok: true, data: visited });
  } catch (error) {
    if (error instanceof VisitedStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update visited country";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    await deleteVisited(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof VisitedStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete visited country";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
