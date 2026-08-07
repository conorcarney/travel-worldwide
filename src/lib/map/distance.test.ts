import { describe, expect, it } from "vitest";
import {
  formatDistanceKm,
  haversineKm,
  pathDistanceKm,
  summarizeTravelStats,
} from "@/lib/map/distance";
import type { MapRoute } from "@/lib/validations/map-data";

describe("haversineKm", () => {
  it("returns ~0 for the same point", () => {
    expect(haversineKm([53.35, -6.26], [53.35, -6.26])).toBeCloseTo(0, 5);
  });

  it("estimates Dublin to Paris Beauvais around 720 km", () => {
    const km = haversineKm([53.3498, -6.2603], [49.4545, 2.1115]);
    expect(km).toBeGreaterThan(700);
    expect(km).toBeLessThan(750);
  });
});

describe("pathDistanceKm", () => {
  it("sums consecutive segments", () => {
    const a: [number, number] = [0, 0];
    const b: [number, number] = [0, 1];
    const c: [number, number] = [0, 2];
    expect(pathDistanceKm([a, b, c])).toBeCloseTo(
      haversineKm(a, b) + haversineKm(b, c),
      5,
    );
  });
});

describe("summarizeTravelStats", () => {
  const routes: MapRoute[] = [
    {
      id: "1",
      mode: "flight",
      from: "A",
      to: "B",
      date: "01/01/2020",
      path: [
        [0, 0],
        [0, 1],
      ],
      distanceKm: 100,
    },
    {
      id: "2",
      mode: "flight",
      from: "C",
      to: "D",
      date: "01/01/2021",
      path: [
        [0, 0],
        [0, 1],
      ],
      distanceKm: 50,
    },
    {
      id: "3",
      mode: "train",
      from: "E",
      to: "F",
      date: "01/01/2022",
      path: [
        [0, 0],
        [0, 1],
      ],
      distanceKm: 200,
    },
  ];

  it("aggregates counts and distances by mode plus totals", () => {
    const summary = summarizeTravelStats(routes);
    expect(summary.totalCount).toBe(3);
    expect(summary.totalDistanceKm).toBe(350);

    const flights = summary.byMode.find((entry) => entry.mode === "flight");
    const trains = summary.byMode.find((entry) => entry.mode === "train");
    const buses = summary.byMode.find((entry) => entry.mode === "bus");

    expect(flights).toEqual({ mode: "flight", count: 2, distanceKm: 150 });
    expect(trains).toEqual({ mode: "train", count: 1, distanceKm: 200 });
    expect(buses).toEqual({ mode: "bus", count: 0, distanceKm: 0 });
  });
});

describe("formatDistanceKm", () => {
  it("rounds long distances to whole kilometres", () => {
    expect(formatDistanceKm(1234.6)).toBe("1,235 km");
  });

  it("keeps one decimal for short distances", () => {
    expect(formatDistanceKm(12.34)).toBe("12.3 km");
  });
});
