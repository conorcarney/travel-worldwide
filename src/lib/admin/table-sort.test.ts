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
    expect(dateSortKey("19/01/2023")).toBe("20230119000000");
    expect(dateSortKey("2/2020")).toBe("20200200000000");
    expect(dateSortKey("2019-08-12")).toBe("20190812000000");
    expect(dateSortKey("")).toBe("");
  });

  it("includes time so same-day rows sort chronologically", () => {
    expect(dateSortKey("19/01/2023 08:15")).toBe("20230119081500");
    expect(dateSortKey("19/01/2023 14:30")).toBe("20230119143000");
    expect(dateSortKey("19/01/2023 08:15") < dateSortKey("20/01/2023")).toBe(
      true,
    );
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
