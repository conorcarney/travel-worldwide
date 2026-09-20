import { describe, expect, it } from "vitest";
import { escapeRegex } from "@/lib/escape-regex";

describe("escapeRegex", () => {
  it("escapes regex metacharacters", () => {
    expect(escapeRegex("Cote d'Ivoire?")).toBe("Cote d'Ivoire\\?");
    expect(escapeRegex("New (Zealand)")).toBe("New \\(Zealand\\)");
  });
});
