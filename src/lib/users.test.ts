import { describe, expect, it } from "vitest";
import { userWriteSchema } from "@/lib/validations/user-write";

describe("userWriteSchema", () => {
  const valid = {
    username: "traveler",
    email: "traveler@example.com",
    password: "password123",
    confirmPassword: "password123",
    role: "user" as const,
  };

  it("accepts a valid registration payload", () => {
    expect(userWriteSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    expect(
      userWriteSchema.safeParse({
        ...valid,
        confirmPassword: "different",
      }).success,
    ).toBe(false);
  });

  it("rejects short passwords", () => {
    expect(
      userWriteSchema.safeParse({
        ...valid,
        password: "short",
        confirmPassword: "short",
      }).success,
    ).toBe(false);
  });
});
