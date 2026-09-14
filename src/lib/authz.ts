import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { readAuthSession } from "@/lib/auth-session";
import { isAdminSession } from "@/lib/session-roles";

export { isAdminSession } from "@/lib/session-roles";

export async function requireAdminApi() {
  const session = await readAuthSession(() => auth());
  if (!isAdminSession(session)) {
    return {
      session: null,
      error: NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      ),
    } as const;
  }

  return { session, error: null } as const;
}
