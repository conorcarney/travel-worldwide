import { describe, expect, it } from "vitest";
import { DEFAULT_LAYERS } from "@/lib/map/filter-url";
import {
  findPlayableTripIndex,
  isModeVisibleOnMap,
} from "@/lib/map/mode-visibility";

const detailedOff = { road: false, train: false, ferry: false };
const detailedOn = { road: true, train: true, ferry: true };

describe("isModeVisibleOnMap", () => {
  it("keeps flights on the flight checkbox", () => {
    expect(isModeVisibleOnMap("flight", DEFAULT_LAYERS, detailedOn)).toBe(true);
    expect(
      isModeVisibleOnMap("flight", { ...DEFAULT_LAYERS, flight: false }, detailedOn),
    ).toBe(false);
  });

  it("shows land modes from detailed overlays even when slow checkboxes are off", () => {
    expect(isModeVisibleOnMap("bus", DEFAULT_LAYERS, detailedOn)).toBe(true);
    expect(isModeVisibleOnMap("car", DEFAULT_LAYERS, detailedOn)).toBe(true);
    expect(isModeVisibleOnMap("train", DEFAULT_LAYERS, detailedOn)).toBe(true);
    expect(isModeVisibleOnMap("ferry", DEFAULT_LAYERS, detailedOn)).toBe(true);
    expect(isModeVisibleOnMap("bus", DEFAULT_LAYERS, detailedOff)).toBe(false);
  });

  it("shows land modes from slow-loading checkboxes", () => {
    expect(
      isModeVisibleOnMap("bus", { ...DEFAULT_LAYERS, bus: true }, detailedOff),
    ).toBe(true);
  });

  it("scopes the road overlay to a checked car or bus filter", () => {
    const carOnly = { ...DEFAULT_LAYERS, flight: false, car: true };
    expect(isModeVisibleOnMap("car", carOnly, { ...detailedOn, train: false, ferry: false })).toBe(
      true,
    );
    expect(isModeVisibleOnMap("bus", carOnly, { ...detailedOn, train: false, ferry: false })).toBe(
      false,
    );
  });
});

describe("findPlayableTripIndex", () => {
  const queue = ["ferry-1", "car-1", "ferry-2", "car-2"];
  const cars = (id: string) => id.startsWith("car");

  it("finds the previous playable trip, skipping hidden modes", () => {
    expect(findPlayableTripIndex(queue, 2, -1, cars)).toBe(1);
    expect(findPlayableTripIndex(queue, 1, -1, cars)).toBe(1);
    expect(findPlayableTripIndex(queue, 0, -1, cars)).toBeNull();
  });

  it("finds the next playable trip, skipping hidden modes", () => {
    expect(findPlayableTripIndex(queue, 2, 1, cars)).toBe(3);
    expect(findPlayableTripIndex(queue, 1, 1, cars)).toBe(1);
    expect(findPlayableTripIndex(queue, 4, 1, cars)).toBeNull();
  });
});
