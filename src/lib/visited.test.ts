import { describe, expect, it } from "vitest";
import { toVisitedDocument } from "@/lib/visited";
import { visitedWriteSchema } from "@/lib/validations/visited-write";

describe("visitedWriteSchema", () => {
  it("requires a country name", () => {
    expect(visitedWriteSchema.safeParse({ name: "" }).success).toBe(false);
    expect(visitedWriteSchema.safeParse({ name: "Ireland" }).success).toBe(
      true,
    );
  });

  it("treats blank date as undefined", () => {
    const parsed = visitedWriteSchema.safeParse({
      name: "Spain",
      date: "  ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.date).toBeUndefined();
    }
  });
});

describe("toVisitedDocument", () => {
  it("omits date when not provided", () => {
    expect(toVisitedDocument({ name: "Ireland" })).toEqual({
      name: "Ireland",
    });
  });

  it("includes date when provided", () => {
    expect(toVisitedDocument({ name: "Spain", date: "08/2019" })).toEqual({
      name: "Spain",
      date: "08/2019",
    });
  });
});
