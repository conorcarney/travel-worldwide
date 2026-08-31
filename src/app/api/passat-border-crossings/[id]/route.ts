import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import {
  PassatBorderCrossingStoreError,
  deletePassatBorderCrossing,
  passatBorderCrossingWriteSchema,
  updatePassatBorderCrossing,
} from "@/lib/passat-border-crossings-store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = passatBorderCrossingWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid border crossing",
        },
        { status: 400 },
      );
    }

    const crossing = await updatePassatBorderCrossing(id, parsed.data);
    return NextResponse.json({ ok: true, data: crossing });
  } catch (error) {
    if (error instanceof PassatBorderCrossingStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update border crossing";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    await deletePassatBorderCrossing(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PassatBorderCrossingStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete border crossing";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
