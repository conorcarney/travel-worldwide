import { describe, expect, it } from "vitest";
import { parseAdminJson } from "@/lib/admin/api";
import { yearBarLayout } from "@/lib/stats/year-bar-chart";

describe("parseAdminJson", () => {
  it("returns the body when ok", async () => {
    const response = Response.json({ ok: true, data: [{ _id: "1" }] });
    await expect(parseAdminJson(response, "Failed")).resolves.toEqual({
      ok: true,
      data: [{ _id: "1" }],
    });
  });

  it("throws the API error message", async () => {
    const response = Response.json(
      { ok: false, error: "taken" },
      { status: 409 },
    );
    await expect(parseAdminJson(response, "Failed")).rejects.toThrow("taken");
  });
});

describe("yearBarLayout", () => {
  it("uses a minimum inner width and bar size", () => {
    const layout = yearBarLayout(1);
    expect(layout.width).toBe(36 + 560 + 8);
    expect(layout.barWidth).toBeGreaterThanOrEqual(8);
  });
});
