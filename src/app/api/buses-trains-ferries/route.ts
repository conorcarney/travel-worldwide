import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { createCollectionGetHandler } from "@/lib/create-collection-handler";
import {
  createSurfaceRoute,
  SurfaceRouteStoreError,
  surfaceRouteWriteSchema,
} from "@/lib/surface-routes";

export const GET = createCollectionGetHandler("busesTrainsAndFerries");

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
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

    const route = await createSurfaceRoute(parsed.data);
    return NextResponse.json({ ok: true, data: route }, { status: 201 });
  } catch (error) {
    if (error instanceof SurfaceRouteStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to create route";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
