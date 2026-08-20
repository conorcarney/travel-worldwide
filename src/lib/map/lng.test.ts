import { describe, expect, it } from "vitest";
import { shortestLngDelta } from "@/lib/map/lng";

describe("shortestLngDelta", () => {
  it("keeps a short eastbound gap unchanged", () => {
    expect(shortestLngDelta(-6, 2)).toBeCloseTo(8);
  });

  it("takes the Pacific for Brisbane to Los Angeles", () => {
    const delta = shortestLngDelta(153.03, -118.41);
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(180);
    expect(delta).toBeCloseTo(88.56, 1);
  });
});
