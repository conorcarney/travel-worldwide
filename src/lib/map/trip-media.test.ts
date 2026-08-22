import { describe, expect, it } from "vitest";
import {
  classifyTripMedia,
  fitMediaBox,
  mediaCountLabel,
  parseMediaUrls,
  parseTripMedia,
} from "@/lib/map/trip-media";

describe("parseMediaUrls", () => {
  it("splits on newlines and commas and keeps http(s) or local paths", () => {
    expect(
      parseMediaUrls(
        "https://cdn.example/a.jpg\nhttps://cdn.example/b.mp4, /trip/c.webp",
      ),
    ).toEqual([
      "https://cdn.example/a.jpg",
      "https://cdn.example/b.mp4",
      "/trip/c.webp",
    ]);
  });

  it("drops blank and invalid entries", () => {
    expect(parseMediaUrls("not a url\nftp://x.com/a.jpg\n")).toEqual([]);
  });
});

describe("classifyTripMedia", () => {
  it("detects images, files, and YouTube", () => {
    expect(classifyTripMedia("https://cdn.example/shot.PNG").kind).toBe("image");
    expect(classifyTripMedia("https://cdn.example/clip.mp4").kind).toBe("video");
    expect(classifyTripMedia("https://youtu.be/abc123XYZ").kind).toBe("youtube");
    expect(classifyTripMedia("https://youtu.be/abc123XYZ").embedUrl).toContain(
      "abc123XYZ",
    );
  });
});

describe("parseTripMedia", () => {
  it("returns classified items in order", () => {
    const items = parseTripMedia("https://youtu.be/aa\nhttps://x.com/a.jpg");
    expect(items.map((item) => item.kind)).toEqual(["youtube", "image"]);
  });
});

describe("mediaCountLabel", () => {
  it("summarizes how many files are attached", () => {
    expect(mediaCountLabel("")).toBe("—");
    expect(mediaCountLabel("https://x.com/a.jpg")).toBe("1 file");
    expect(
      mediaCountLabel("https://x.com/a.jpg\nhttps://x.com/b.mp4"),
    ).toBe("2 files");
  });
});

describe("fitMediaBox", () => {
  it("keeps the media aspect ratio and stays under 1/3 of the map area", () => {
    const box = fitMediaBox(1200, 900, 1600, 900);
    expect(box.width / box.height).toBeCloseTo(16 / 9, 2);
    expect(box.width * box.height).toBeLessThanOrEqual(
      (1200 * 900) / 3 + 1,
    );
  });

  it("shrinks tall portraits so they fit the height margin", () => {
    const box = fitMediaBox(1000, 800, 400, 1200);
    expect(box.height).toBeLessThanOrEqual(Math.round(800 * 0.72));
    expect(box.width / box.height).toBeCloseTo(400 / 1200, 2);
  });
});
