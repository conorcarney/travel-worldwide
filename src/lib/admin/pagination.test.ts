import { describe, expect, it } from "vitest";
import { paginateRows } from "@/lib/admin/pagination";

describe("paginateRows", () => {
  const rows = [1, 2, 3, 4, 5, 6, 7];

  it("slices a page and reports the visible range", () => {
    expect(paginateRows(rows, 2, 3)).toEqual({
      page: 2,
      totalPages: 3,
      total: 7,
      start: 4,
      end: 6,
      rows: [4, 5, 6],
    });
  });

  it("clamps a page that is past the end", () => {
    const slice = paginateRows(rows, 99, 3);
    expect(slice.page).toBe(3);
    expect(slice.rows).toEqual([7]);
  });

  it("returns an empty first page when there are no rows", () => {
    expect(paginateRows([], 1, 50)).toEqual({
      page: 1,
      totalPages: 1,
      total: 0,
      start: 0,
      end: 0,
      rows: [],
    });
  });
});
