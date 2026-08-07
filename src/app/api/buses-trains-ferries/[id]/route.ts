import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import {
  deleteSurfaceRoute,
  SurfaceRouteStoreError,
  surfaceRouteWriteSchema,
  updateSurfaceRoute,
} from "@/lib/surface-routes";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = surfaceRouteWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid route",
        },
        { status: 400 },
      );
    }

    const route = await updateSurfaceRoute(id, parsed.data);
    return NextResponse.json({ ok: true, data: route });
  } catch (error) {
    if (error instanceof SurfaceRouteStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to update route";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    await deleteSurfaceRoute(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SurfaceRouteStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to delete route";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
