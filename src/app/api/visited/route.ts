import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { createCollectionGetHandler } from "@/lib/create-collection-handler";
import {
  createVisited,
  VisitedStoreError,
  visitedWriteSchema,
} from "@/lib/visited";

export const GET = createCollectionGetHandler("visited");

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
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

    const visited = await createVisited(parsed.data);
    return NextResponse.json({ ok: true, data: visited }, { status: 201 });
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
        : "Failed to create visited country";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
