import { describe, expect, it } from "vitest";
import {
  dateSortKey,
  nextSortState,
  sortRows,
} from "@/lib/admin/table-sort";

describe("nextSortState", () => {
  it("starts ascending on a new column", () => {
    expect(nextSortState(null, "date")).toEqual({
      key: "date",
      direction: "asc",
    });
  });

  it("toggles direction on the same column", () => {
    expect(nextSortState({ key: "date", direction: "asc" }, "date")).toEqual({
      key: "date",
      direction: "desc",
    });
  });

  it("resets to ascending when switching columns", () => {
    expect(
      nextSortState({ key: "date", direction: "desc" }, "route"),
    ).toEqual({
      key: "route",
      direction: "asc",
    });
  });
});

describe("dateSortKey", () => {
  it("normalizes common admin date formats", () => {
    expect(dateSortKey("19/01/2023")).toBe("20230119");
    expect(dateSortKey("2/2020")).toBe("20200200");
    expect(dateSortKey("2019-08-12")).toBe("20190812");
    expect(dateSortKey("")).toBe("");
  });
});

describe("sortRows", () => {
  const rows = [
    { name: "Spain", date: "01/01/2020" },
    { name: "Ireland", date: "15/06/2018" },
    { name: "Belize", date: "01/01/2022" },
  ];

  it("returns original order when sort is null", () => {
    expect(sortRows(rows, null, { name: (row) => row.name })).toEqual(rows);
  });

  it("sorts by accessor ascending and descending", () => {
    expect(
      sortRows(rows, { key: "name", direction: "asc" }, {
        name: (row) => row.name,
      }).map((row) => row.name),
    ).toEqual(["Belize", "Ireland", "Spain"]);

    expect(
      sortRows(rows, { key: "name", direction: "desc" }, {
        name: (row) => row.name,
      }).map((row) => row.name),
    ).toEqual(["Spain", "Ireland", "Belize"]);
  });

  it("sorts dates by normalized key", () => {
    expect(
      sortRows(rows, { key: "date", direction: "asc" }, {
        date: (row) => dateSortKey(row.date),
      }).map((row) => row.name),
    ).toEqual(["Ireland", "Spain", "Belize"]);
  });
});
