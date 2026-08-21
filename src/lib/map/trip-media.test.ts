import { describe, expect, it } from "vitest";
import {
  classifyTripMedia,
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
