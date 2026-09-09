import { describe, expect, it } from "vitest";
import { adjacentIndex, wrapIndex } from "@/lib/stats/carousel";

describe("wrapIndex", () => {
  it("returns 0 for an empty collection", () => {
    expect(wrapIndex(3, 0)).toBe(0);
  });

  it("keeps in-range indexes", () => {
    expect(wrapIndex(0, 3)).toBe(0);
    expect(wrapIndex(2, 3)).toBe(2);
  });

  it("wraps past the last slide back to the first", () => {
    expect(wrapIndex(3, 3)).toBe(0);
    expect(wrapIndex(7, 3)).toBe(1);
  });

  it("wraps before the first slide to the last", () => {
    expect(wrapIndex(-1, 3)).toBe(2);
    expect(wrapIndex(-4, 3)).toBe(2);
  });
});

describe("adjacentIndex", () => {
  it("steps forward and backward around the ends", () => {
    expect(adjacentIndex(0, 4, 1)).toBe(1);
    expect(adjacentIndex(3, 4, 1)).toBe(0);
    expect(adjacentIndex(0, 4, -1)).toBe(3);
  });

  it("stays at 0 when there is a single slide", () => {
    expect(adjacentIndex(0, 1, 1)).toBe(0);
    expect(adjacentIndex(0, 1, -1)).toBe(0);
  });
});
