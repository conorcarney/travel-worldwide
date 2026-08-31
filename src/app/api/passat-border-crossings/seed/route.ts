import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import {
  PassatBorderCrossingStoreError,
  seedPassatBorderCrossings,
} from "@/lib/passat-border-crossings-store";

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      force?: boolean;
    };
    const result = await seedPassatBorderCrossings(Boolean(body.force));
    return NextResponse.json({ ok: true, data: result });
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
        : "Failed to seed border crossings";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
