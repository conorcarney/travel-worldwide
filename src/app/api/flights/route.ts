import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { createCollectionGetHandler } from "@/lib/create-collection-handler";
import {
  createFlight,
  FlightStoreError,
  flightWriteSchema,
} from "@/lib/flights";

export const GET = createCollectionGetHandler("flights");

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
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

    const flight = await createFlight(parsed.data);
    return NextResponse.json({ ok: true, data: flight }, { status: 201 });
  } catch (error) {
    if (error instanceof FlightStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to create flight";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
