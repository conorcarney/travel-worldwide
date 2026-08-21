import { describe, expect, it } from "vitest";
import {
  inferTripMediaType,
  isAllowedTripMediaType,
  mediaObjectKey,
  parseTripDateParts,
  publicObjectUrl,
  sanitizeMediaFilename,
  tripDateFolder,
} from "@/lib/s3/media";
import { mediaUploadRequestSchema } from "@/lib/validations/media-upload";

describe("sanitizeMediaFilename", () => {
  it("keeps a simple name and strips path junk", () => {
    expect(sanitizeMediaFilename("../Brisbane Sunset.JPG")).toBe(
      "brisbane-sunset",
    );
  });
});

describe("mediaObjectKey", () => {
  it("uses the trip date folder and adds an extension from the type", () => {
    const key = mediaObjectKey("LAX.heic", "image/jpeg", "19/01/2023", "abc123");
    expect(key).toBe("trips/2023/01/19/abc123-lax.jpg");
  });

  it("falls back to today when the trip date is missing", () => {
    const key = mediaObjectKey(
      "LAX.heic",
      "image/jpeg",
      "",
      "abc123",
      new Date("2026-08-21T12:00:00Z"),
    );
    expect(key).toBe("trips/2026/08/abc123-lax.jpg");
  });
});

describe("parseTripDateParts", () => {
  it("reads DD/MM/YYYY trip dates", () => {
    expect(parseTripDateParts("19/01/2023")).toEqual({
      year: 2023,
      month: 1,
      day: 19,
    });
  });
});

describe("tripDateFolder", () => {
  it("includes the day when the trip date has one", () => {
    expect(tripDateFolder("10 Aug 2019")).toBe("trips/2019/08/10");
  });
});

describe("publicObjectUrl", () => {
  it("uses the CloudFront base when provided", () => {
    expect(
      publicObjectUrl("trips/2026/08/a-b.jpg", "bucket", "eu-west-1", "https://cdn.example"),
    ).toBe("https://cdn.example/trips/2026/08/a-b.jpg");
  });

  it("falls back to the virtual-hosted S3 URL", () => {
    expect(publicObjectUrl("trips/a.jpg", "my-bucket", "eu-west-1")).toBe(
      "https://my-bucket.s3.eu-west-1.amazonaws.com/trips/a.jpg",
    );
  });
});

describe("inferTripMediaType", () => {
  it("uses the browser type when it is allowed", () => {
    expect(inferTripMediaType("shot.bin", "image/webp")).toBe("image/webp");
  });

  it("falls back to the filename extension", () => {
    expect(inferTripMediaType("clip.MOV", "")).toBe("video/quicktime");
  });
});

describe("mediaUploadRequestSchema", () => {
  it("accepts a jpeg under the size cap", () => {
    expect(
      mediaUploadRequestSchema.safeParse({
        filename: "shot.jpg",
        contentType: "image/jpeg",
        size: 1_000_000,
      }).success,
    ).toBe(true);
    expect(isAllowedTripMediaType("image/jpeg")).toBe(true);
  });

  it("rejects an unsupported type", () => {
    expect(
      mediaUploadRequestSchema.safeParse({
        filename: "notes.pdf",
        contentType: "application/pdf",
        size: 1000,
      }).success,
    ).toBe(false);
  });
});
