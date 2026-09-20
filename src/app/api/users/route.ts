import { NextResponse } from "next/server";
import {
  createAdminCreateHandler,
  handleAdminAction,
} from "@/lib/api/admin-handler";
import { createUser, listPublicUsers, userWriteSchema } from "@/lib/users";

export async function GET() {
  return handleAdminAction("Failed to load users", async () => {
    const data = await listPublicUsers();
    return NextResponse.json({ ok: true, source: "mongodb", data });
  });
}

export const POST = createAdminCreateHandler({
  schema: userWriteSchema,
  invalidMessage: "Invalid user",
  fallbackError: "Failed to create user",
  create: (data) => createUser(data, { allowElevatedRoles: true }),
});
