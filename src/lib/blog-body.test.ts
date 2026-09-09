import { describe, expect, it } from "vitest";
import {
  isSafeBlogImageUrl,
  parseBlogBody,
  stripBlogMarkdown,
} from "@/lib/blog-body";

describe("isSafeBlogImageUrl", () => {
  it("allows http(s) and same-origin paths", () => {
    expect(
      isSafeBlogImageUrl(
        "https://ah-be-grand.s3.eu-west-1.amazonaws.com/trips/photo.jpg",
      ),
    ).toBe(true);
    expect(isSafeBlogImageUrl("/stats/overall.jpg")).toBe(true);
    expect(isSafeBlogImageUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeBlogImageUrl("data:text/html,hi")).toBe(false);
  });
});

describe("parseBlogBody", () => {
  it("turns markdown images into image blocks", () => {
    const blocks = parseBlogBody(
      "A city day.\n\n![Budapest](https://ah-be-grand.s3.eu-west-1.amazonaws.com/trips/2013/01/09/photo.jpg)\n\nThen dinner.",
    );
    expect(blocks).toEqual([
      { type: "paragraph", parts: [{ type: "text", value: "A city day." }] },
      {
        type: "image",
        src: "https://ah-be-grand.s3.eu-west-1.amazonaws.com/trips/2013/01/09/photo.jpg",
        alt: "Budapest",
      },
      { type: "paragraph", parts: [{ type: "text", value: "Then dinner." }] },
    ]);
  });

  it("turns a bare image URL on its own line into an image", () => {
    const src =
      "https://ah-be-grand.s3.eu-west-1.amazonaws.com/trips/2013/01/09/photo.jpg";
    expect(parseBlogBody(src)).toEqual([{ type: "image", src, alt: "" }]);
  });

  it("keeps unsafe image markdown as text", () => {
    const blocks = parseBlogBody("![x](data:text/html,hi)");
    expect(blocks).toEqual([
      {
        type: "paragraph",
        parts: [{ type: "text", value: "![x](data:text/html,hi)" }],
      },
    ]);
  });
});

describe("stripBlogMarkdown", () => {
  it("keeps alt text and drops the URL", () => {
    expect(
      stripBlogMarkdown(
        "Hello ![Budapest](https://example.com/a.jpg) https://example.com/b.jpg there",
      ),
    ).toBe("Hello Budapest there");
  });
});
