import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import {
  UserStoreError,
  createUser,
  listPublicUsers,
  userWriteSchema,
} from "@/lib/users";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const data = await listPublicUsers();
    return NextResponse.json({ ok: true, source: "mongodb", data });
  } catch (error) {
    if (error instanceof UserStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to load users";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body: unknown = await request.json();
    const parsed = userWriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid user",
        },
        { status: 400 },
      );
    }

    const user = await createUser(parsed.data, { allowElevatedRoles: true });
    return NextResponse.json({ ok: true, data: user }, { status: 201 });
  } catch (error) {
    if (error instanceof UserStoreError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
