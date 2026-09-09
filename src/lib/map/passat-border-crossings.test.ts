import { describe, expect, it } from "vitest";
import {
  crossingTimeMinutes,
  isCrossingTime,
  isEntryClock,
  normalizePassatBorderCrossings,
  type PassatBorderCrossingRow,
} from "@/lib/map/passat-border-crossings";
import { passatBorderCrossingWriteSchema } from "@/lib/validations/passat-border-crossing-write";
import { toPassatBorderCrossingDocument } from "@/lib/passat-border-crossings-store";

const SAMPLE_ROWS: PassatBorderCrossingRow[] = [
  {
    departureCountry: "Bulgaria",
    entryCountry: "Turkey",
    borderName: "",
    date: "01/06/2025",
    entryTime: "",
    totalCrossingTime: "1:39",
    sortIndex: 0,
  },
  {
    departureCountry: "Thailand",
    entryCountry: "Malaysia",
    borderName: "",
    date: "",
    entryTime: "",
    totalCrossingTime: "3:19",
    sortIndex: 1,
  },
];

describe("crossing time helpers", () => {
  it("accepts hours:minutes including values over 24 hours of clock time", () => {
    expect(isCrossingTime("1:39")).toBe(true);
    expect(isCrossingTime("0:13")).toBe(true);
    expect(isCrossingTime("6:55")).toBe(true);
    expect(isCrossingTime("1:60")).toBe(false);
    expect(isCrossingTime("")).toBe(false);
  });

  it("converts crossing times to minutes for sorting", () => {
    expect(crossingTimeMinutes("0:45")).toBe(45);
    expect(crossingTimeMinutes("1:39")).toBe(99);
    expect(crossingTimeMinutes("6:55")).toBe(415);
  });

  it("validates 24-hour entry clocks", () => {
    expect(isEntryClock("14:30")).toBe(true);
    expect(isEntryClock("9:05")).toBe(true);
    expect(isEntryClock("24:00")).toBe(false);
  });
});

describe("passatBorderCrossingWriteSchema", () => {
  const valid = {
    departureCountry: "Bulgaria",
    entryCountry: "Turkey",
    totalCrossingTime: "1:39",
    date: "01/06/2025",
  };

  it("defaults optional fields to empty strings", () => {
    const parsed = passatBorderCrossingWriteSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.borderName).toBe("");
      expect(parsed.data.entryTime).toBe("");
    }
  });

  it("allows a crossing with no date", () => {
    const parsed = passatBorderCrossingWriteSchema.safeParse({
      departureCountry: "China",
      entryCountry: "Laos",
      totalCrossingTime: "2:25",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid crossing time", () => {
    expect(
      passatBorderCrossingWriteSchema.safeParse({
        ...valid,
        totalCrossingTime: "90 minutes",
      }).success,
    ).toBe(false);
  });
});

describe("toPassatBorderCrossingDocument", () => {
  it("stores optional fields and sort order", () => {
    expect(
      toPassatBorderCrossingDocument(
        {
          departureCountry: "Georgia",
          entryCountry: "Russia",
          borderName: "Upper Lars",
          date: "26/10/2025",
          entryTime: "11:00",
          totalCrossingTime: "4:01",
        },
        8,
      ),
    ).toEqual({
      departureCountry: "Georgia",
      entryCountry: "Russia",
      borderName: "Upper Lars",
      date: "26/10/2025",
      entryTime: "11:00",
      totalCrossingTime: "4:01",
      sortIndex: 8,
    });
  });
});

describe("normalizePassatBorderCrossings", () => {
  it("keeps sort order and drops incomplete rows", () => {
    const rows = normalizePassatBorderCrossings([
      ...SAMPLE_ROWS,
      { departureCountry: "Nowhere" },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => `${row.departureCountry}-${row.entryCountry}`)).toEqual(
      SAMPLE_ROWS.map(
        (row) => `${row.departureCountry}-${row.entryCountry}`,
      ),
    );
  });
});
