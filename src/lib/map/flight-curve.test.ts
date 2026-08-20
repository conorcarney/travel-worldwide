import { describe, expect, it } from "vitest";
import { curveFlightPath, curveSegment } from "@/lib/map/flight-curve";

describe("curveSegment", () => {
  it("returns more than two points for a curved arc", () => {
    const curved = curveSegment([53.35, -6.26], [49.45, 2.11], {
      segments: 10,
    });
    expect(curved.length).toBe(11);
    expect(curved[0]).toEqual([53.35, -6.26]);
    expect(curved.at(-1)).toEqual([49.45, 2.11]);
  });

  it("takes the Pacific for Brisbane to Los Angeles", () => {
    const brisbane: [number, number] = [-27.47, 153.03];
    const losAngeles: [number, number] = [33.94, -118.41];
    const curved = curveSegment(brisbane, losAngeles, { segments: 8 });
    const midLng = curved[4]![1];
    expect(midLng).toBeGreaterThan(170);
    expect(midLng).toBeLessThan(250);
    expect(curved.every(([, lng]) => lng > 140)).toBe(true);
  });

  it("curves opposite directions for outbound vs return", () => {
    const outbound = curveSegment([0, 0], [0, 10], { segments: 2, curvature: 0.2 });
    const inbound = curveSegment([0, 10], [0, 0], { segments: 2, curvature: 0.2 });
    // Midpoints should bow to opposite sides of the chord.
    expect(outbound[1]?.[0]).not.toBe(inbound[1]?.[0]);
    expect(Math.sign(outbound[1]![0])).toBe(-Math.sign(inbound[1]![0]));
  });
});

describe("curveFlightPath", () => {
  it("curves multi-stop flights without duplicating joints", () => {
    const path = curveFlightPath(
      [
        [0, 0],
        [1, 1],
        [2, 0],
      ],
      { segments: 4 },
    );
    expect(path[0]).toEqual([0, 0]);
    expect(path.at(-1)).toEqual([2, 0]);
    expect(path.length).toBe(9); // 5 + 4 (shared joint)
  });
});
