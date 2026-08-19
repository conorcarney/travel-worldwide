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

  it("normalizes comma-separated other visit dates", () => {
    const parsed = visitedWriteSchema.safeParse({
      name: "Spain",
      date: "06/2018",
      other_visit_dates: " 08/2020,  03/2022 , ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.date).toBe("06/2018");
      expect(parsed.data.other_visit_dates).toBe("08/2020, 03/2022");
    }
  });

  it("treats blank other visit dates as undefined", () => {
    const parsed = visitedWriteSchema.safeParse({
      name: "Spain",
      other_visit_dates: " ,  ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.other_visit_dates).toBeUndefined();
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

  it("includes other visit dates when provided", () => {
    expect(
      toVisitedDocument({
        name: "Spain",
        date: "08/2019",
        other_visit_dates: "03/2022, 19/01/2023",
      }),
    ).toEqual({
      name: "Spain",
      date: "08/2019",
      other_visit_dates: "03/2022, 19/01/2023",
    });
  });
});
