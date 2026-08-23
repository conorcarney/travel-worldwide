import { describe, expect, it } from "vitest";
import { contactFormSchema } from "@/lib/validations/contact-write";

describe("contactFormSchema", () => {
  it("accepts valid input", () => {
    const parsed = contactFormSchema.safeParse({
      name: "Conor",
      email: "conor@example.com",
      message: "Hello!",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(contactFormSchema.safeParse({ name: "", email: "x", message: "" }).success).toBe(
      false,
    );
    expect(
      contactFormSchema.safeParse({ name: "A", email: "not-email", message: "Hi" })
        .success,
    ).toBe(false);
  });
});
