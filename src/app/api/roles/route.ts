import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/authz";
import { createCollectionGetHandler } from "@/lib/create-collection-handler";

const listRoles = createCollectionGetHandler("roles");

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  return listRoles();
}

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Method not allowed" },
    { status: 405 },
  );
}
