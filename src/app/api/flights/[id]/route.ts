import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import {
  deleteFlight,
  FlightStoreError,
  flightWriteSchema,
  updateFlight,
} from "@/lib/flights";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = flightWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid flight",
        },
        { status: 400 },
      );
    }

    const flight = await updateFlight(id, parsed.data);
    return NextResponse.json({ ok: true, data: flight });
  } catch (error) {
    if (error instanceof FlightStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to update flight";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    await deleteFlight(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof FlightStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to delete flight";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
