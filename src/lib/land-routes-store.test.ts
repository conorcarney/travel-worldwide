import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { encodeExistingLine } from "@/lib/land-routes-encode";
import { toLandRouteMongoDoc } from "@/lib/land-routes-store";
import type { SurfaceRouteWriteInput } from "@/lib/validations/surface-route-write";

const input: SurfaceRouteWriteInput = {
  departure: "Ica",
  arrival: "Lima",
  departure_latitude: -14.07,
  departure_longitude: -75.73,
  arrival_latitude: -12.06,
  arrival_longitude: -77.02,
  type: "Bus",
  date: "27/02/2019",
  tags: "Andes",
  media: "",
};

describe("toLandRouteMongoDoc", () => {
  it("stores the same id as the surface route and omits the encode source", () => {
    const id = new ObjectId().toHexString();
    const encoded = encodeExistingLine(input);
    const doc = toLandRouteMongoDoc(id, encoded);
    expect(doc._id.toHexString()).toBe(id);
    expect(doc.type).toBe("Bus");
    expect(doc.date).toBe("27/02/2019");
    expect(doc.tags).toBe("Andes");
    expect(doc.route.geometry).toBe(encoded.route.geometry);
    expect(doc).not.toHaveProperty("source");
  });
});
