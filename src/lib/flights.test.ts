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

  it("accepts a valid flight payload", () => {
    expect(flightWriteSchema.safeParse(valid).success).toBe(true);
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
      }),
    ).toEqual({
      departure: "Dublin",
      arrival: "Paris",
      connecting: "",
      date: "19/01/2023",
      departure_coordinates: "-6.2603, 53.3498",
      connecting_coordinates: "",
      arrival_coordinates: "2.1115, 49.4545",
    });
  });
});
