import { describe, expect, it } from "vitest";
import {
  followZoom,
  geographicBearing,
  headingPaneTransform,
  interpolateJourney,
  journeyDurationMs,
  lerpAngle,
  lerpLatLng,
  easeInOutCubic,
  bridgeDurationMs,
  playbackSpeedMultiplier,
  followCameraTarget,
  rotationTilePadRatio,
  shortestAngleDelta,
  vehicleFollowTransform,
  FOLLOW_PITCH_DEG,
} from "@/lib/map/journey";

describe("journeyDurationMs", () => {
  it("clamps short hops and long-haul flights", () => {
    expect(journeyDurationMs(10)).toBe(900);
    expect(journeyDurationMs(8000)).toBe(2600);
    expect(journeyDurationMs(1000)).toBeGreaterThan(900);
    expect(journeyDurationMs(1000)).toBeLessThan(2600);
  });

  it("uses the minimum for invalid distances", () => {
    expect(journeyDurationMs(0)).toBe(900);
    expect(journeyDurationMs(Number.NaN)).toBe(900);
  });

  it("scales with playback speed", () => {
    const normal = journeyDurationMs(1000, 1);
    expect(journeyDurationMs(1000, 2)).toBe(Math.round(normal / 2));
    expect(journeyDurationMs(1000, 0.5)).toBe(Math.round(normal / 0.5));
    expect(playbackSpeedMultiplier("fast")).toBe(2);
  });
});

describe("headingPaneTransform", () => {
  const pos = { x: -40, y: 20 };
  const size = { x: 800, y: 600 };

  it("keeps north-up at bearing 0", () => {
    expect(headingPaneTransform(pos, size, 0)).toContain("rotate(0deg)");
  });

  it("rotates the map so eastbound travel faces up", () => {
    expect(headingPaneTransform(pos, size, 90)).toContain("rotate(-90deg)");
  });

  it("adds a chase-cam pitch and Z rotation while following", () => {
    const pitched = headingPaneTransform(pos, size, 90, 50);
    expect(pitched).toContain("rotateX(50deg)");
    expect(pitched).toContain("rotateZ(-90deg)");
    expect(pitched).toContain("translateY(");
  });
});

describe("vehicleFollowTransform", () => {
  it("only yaws when the map is flat", () => {
    expect(vehicleFollowTransform(40, 0)).toBe("rotate(40deg)");
  });

  it("keeps the icon on the map plane while following", () => {
    expect(vehicleFollowTransform(40, 50)).toBe("rotate(40deg)");
    expect(vehicleFollowTransform(40, 50)).not.toContain("rotateX");
  });
});

describe("rotationTilePadRatio", () => {
  it("pads a square view enough to cover a 45 degree turn", () => {
    expect(rotationTilePadRatio({ x: 100, y: 100 })).toBeCloseTo(
      (Math.SQRT2 - 1) / 2 + 0.08,
      5,
    );
  });

  it("pads a wide view enough to cover a 90 degree turn", () => {
    const pad = rotationTilePadRatio({ x: 200, y: 100 });
    expect(pad).toBeGreaterThan((2 - 1) / 2);
  });

  it("loads extra tiles when the follow-cam is pitched", () => {
    const flat = rotationTilePadRatio({ x: 100, y: 100 }, 0);
    const pitched = rotationTilePadRatio({ x: 100, y: 100 }, FOLLOW_PITCH_DEG);
    expect(pitched).toBeGreaterThan(flat);
  });
});

describe("followZoom", () => {
  it("zooms in past a fitted route and clamps", () => {
    expect(followZoom(5)).toBe(12);
    expect(followZoom(2)).toBe(9);
    expect(followZoom(14)).toBe(16);
    expect(followZoom(Number.NaN)).toBe(12);
  });
});

describe("geographicBearing", () => {
  it("points east and north for axis-aligned moves", () => {
    expect(geographicBearing([0, 0], [0, 10])).toBeCloseTo(90, 0);
    expect(geographicBearing([0, 0], [10, 0])).toBeCloseTo(0, 0);
  });

  it("returns 0 when from and to are the same", () => {
    expect(geographicBearing([53.3, -6.2], [53.3, -6.2])).toBe(0);
  });
});

describe("interpolateJourney", () => {
  const path: [number, number][] = [
    [0, 0],
    [0, 2],
    [0, 4],
  ];

  it("starts at the first point and ends at the last", () => {
    const start = interpolateJourney(path, 0);
    const end = interpolateJourney(path, 1);
    expect(start.position).toEqual([0, 0]);
    expect(end.position[0]).toBeCloseTo(0, 5);
    expect(end.position[1]).toBeCloseTo(4, 5);
    expect(start.traveled[0]).toEqual([0, 0]);
    expect(end.traveled.at(-1)?.[1]).toBeCloseTo(4, 5);
  });

  it("is halfway along equal segments at t=0.5", () => {
    const mid = interpolateJourney(path, 0.5);
    expect(mid.position[1]).toBeCloseTo(2, 5);
    expect(mid.bearing).toBeCloseTo(90, 0);
  });

  it("clamps progress outside 0–1", () => {
    expect(interpolateJourney(path, -1).position).toEqual([0, 0]);
    expect(interpolateJourney(path, 2).position[1]).toBeCloseTo(4, 5);
  });
});

describe("lerpAngle / followCameraTarget", () => {
  it("takes the short way around 360°", () => {
    expect(lerpAngle(350, 10, 0.5)).toBeCloseTo(0, 5);
    expect(shortestAngleDelta(350, 10)).toBeCloseTo(20, 5);
  });

  it("uses a look-ahead chord for bearing on a curve", () => {
    const curved: [number, number][] = [
      [0, 0],
      [1, 4],
      [0, 8],
    ];
    const atJoint = interpolateJourney(curved, 0.5);
    const follow = followCameraTarget(curved, 0.5, 0.2);
    expect(follow.position).toEqual(atJoint.position);
    expect(follow.bearing).not.toBeCloseTo(atJoint.bearing, 0);
  });
});

describe("camera bridge helpers", () => {
  it("eases slowly at the start and end", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
  });

  it("lerps map coordinates and scales bridge duration with speed", () => {
    expect(lerpLatLng([0, 0], [10, 20], 0.5)).toEqual([5, 10]);
    expect(bridgeDurationMs(1)).toBe(1600);
    expect(bridgeDurationMs(2)).toBe(800);
  });
});
