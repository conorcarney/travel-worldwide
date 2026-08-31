import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { jsonError, jsonOk, loadCollection } from "@/lib/data";
import {
  PassatBorderCrossingStoreError,
  createPassatBorderCrossing,
  ensurePassatBorderCrossingsSeeded,
  passatBorderCrossingWriteSchema,
} from "@/lib/passat-border-crossings-store";

export async function GET() {
  try {
    await ensurePassatBorderCrossingsSeeded();
    const payload = await loadCollection("passatBorderCrossings");
    return jsonOk(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load collection";
    return jsonError(message);
  }
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
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

    const crossing = await createPassatBorderCrossing(parsed.data);
    return NextResponse.json({ ok: true, data: crossing }, { status: 201 });
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
        : "Failed to create border crossing";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
