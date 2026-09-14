import { describe, expect, it } from "vitest";
import {
  isInvalidSessionError,
  readAuthSession,
} from "@/lib/auth-session";

describe("isInvalidSessionError", () => {
  it("detects Auth.js JWT session failures", () => {
    const error = Object.assign(new Error("JWTSessionError"), {
      name: "JWTSessionError",
      type: "JWTSessionError",
    });
    expect(isInvalidSessionError(error)).toBe(true);
    expect(
      isInvalidSessionError(
        Object.assign(new Error("session"), {
          cause: new Error("no matching decryption secret"),
        }),
      ),
    ).toBe(true);
    expect(
      isInvalidSessionError(
        Object.assign(new Error("Read more at https://errors.authjs.dev#jwtsessionerror"), {
          name: "JWTSessionError",
          type: "JWTSessionError",
          cause: { err: new Error("no matching decryption secret") },
        }),
      ),
    ).toBe(true);
    expect(isInvalidSessionError(new Error("boom"))).toBe(false);
  });
});

describe("readAuthSession", () => {
  it("returns null when the session cookie cannot be decrypted", async () => {
    await expect(
      readAuthSession(async () => {
        throw Object.assign(new Error("JWTSessionError"), {
          name: "JWTSessionError",
        });
      }),
    ).resolves.toBeNull();
  });

  it("returns the session when auth succeeds", async () => {
    await expect(
      readAuthSession(async () => ({ user: { email: "a@b.c" } })),
    ).resolves.toEqual({ user: { email: "a@b.c" } });
  });
});
