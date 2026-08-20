import { describe, expect, it } from "vitest";
import { vehicleIconHtml, vehicleModelHtml } from "@/lib/map/vehicle-icons";

describe("vehicle icons", () => {
  it("builds a 3D CSS model for each follow-cam mode", () => {
    expect(vehicleModelHtml("car")).toContain("v3d--car");
    expect(vehicleModelHtml("bus")).toContain("v3d--bus");
    expect(vehicleModelHtml("flight")).toContain("v3d--flight");
    expect(vehicleModelHtml("ferry")).toContain("v3d--ferry");
    expect(vehicleModelHtml("car")).toContain("--v3d-body:#14b8a6");
  });

  it("wraps the model in a yawed follow-cam marker", () => {
    const html = vehicleIconHtml("car", 90);
    expect(html).toContain('data-testid="journey-vehicle"');
    expect(html).toContain("rotate(90deg)");
    expect(html).toContain("v3d-wheel");
  });
});
