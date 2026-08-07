import { describe, expect, it } from "vitest";
import { isAdminSession } from "@/lib/session-roles";

describe("isAdminSession", () => {
  it("returns true only for admin role", () => {
    expect(isAdminSession({ user: { roles: ["admin"] } })).toBe(true);
    expect(isAdminSession({ user: { roles: ["user"] } })).toBe(false);
    expect(isAdminSession(null)).toBe(false);
  });
});
