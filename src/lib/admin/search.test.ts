import { describe, expect, it } from "vitest";
import { filterRowsByQuery, rowMatchesQuery, tokenizeQuery } from "@/lib/admin/search";

describe("tokenizeQuery", () => {
  it("splits on whitespace and lowercases", () => {
    expect(tokenizeQuery("  Dublin  2019 ")).toEqual(["dublin", "2019"]);
  });

  it("returns an empty list for blank input", () => {
    expect(tokenizeQuery("   ")).toEqual([]);
  });
});

describe("rowMatchesQuery", () => {
  it("matches when every token appears in the haystack", () => {
    expect(rowMatchesQuery("Train Dublin Cork 08/2019 Work", "dublin 2019")).toBe(
      true,
    );
  });

  it("rejects when a token is missing", () => {
    expect(rowMatchesQuery("Train Dublin Cork 08/2019", "galway")).toBe(false);
  });

  it("matches everything when the query is blank", () => {
    expect(rowMatchesQuery("anything", "  ")).toBe(true);
  });
});

describe("filterRowsByQuery", () => {
  const rows = [
    { city: "Dublin", tags: "Work" },
    { city: "Cork", tags: "Family" },
  ];

  it("returns all rows when the query is empty", () => {
    expect(filterRowsByQuery(rows, "", (row) => `${row.city} ${row.tags}`)).toEqual(
      rows,
    );
  });

  it("keeps rows whose haystack contains the query", () => {
    expect(
      filterRowsByQuery(rows, "family", (row) => `${row.city} ${row.tags}`),
    ).toEqual([{ city: "Cork", tags: "Family" }]);
  });
});
