import { describe, expect, it } from "vitest";
import { toFlightDocument } from "@/lib/flights";
import { flightWriteSchema } from "@/lib/validations/flight-write";

describe("flightWriteSchema", () => {
  const valid = {
    departure: "Dublin",
    arrival: "Paris Beauvais",
    connecting: "",
    date: "19/01/2023",
    departure_coordinates: "-6.2603, 53.3498",
    connecting_coordinates: "",
    arrival_coordinates: "2.1115, 49.4545",
  };

  it("defaults tags to an empty string", () => {
    const parsed = flightWriteSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tags).toBe("");
    }
  });

  it("rejects bad coordinates", () => {
    expect(
      flightWriteSchema.safeParse({
        ...valid,
        departure_coordinates: "53.3 -6.2",
      }).success,
    ).toBe(false);
  });

  it("allows blank connecting coordinates only", () => {
    expect(
      flightWriteSchema.safeParse({
        ...valid,
        connecting_coordinates: "bad",
      }).success,
    ).toBe(false);
  });
});

describe("toFlightDocument", () => {
  it("normalizes coordinate spacing", () => {
    expect(
      toFlightDocument({
        departure: "Dublin",
        arrival: "Paris",
        connecting: "",
        date: "19/01/2023",
        departure_coordinates: "-6.2603,53.3498",
        connecting_coordinates: "",
        arrival_coordinates: "2.1115,  49.4545",
        tags: "Work",
      }),
    ).toEqual({
      departure: "Dublin",
      arrival: "Paris",
      connecting: "",
      date: "19/01/2023",
      departure_coordinates: "-6.2603, 53.3498",
      connecting_coordinates: "",
      arrival_coordinates: "2.1115, 49.4545",
      tags: "Work",
    });
  });
});
