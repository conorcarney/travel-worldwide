import { describe, expect, it } from "vitest";
import { toBlogDocument } from "@/lib/blogs";
import {
  blogWriteSchema,
  briefBlogDescription,
  canAccessBlog,
  isPublicBlog,
  slugifyBlogUrl,
} from "@/lib/validations/blog-write";

describe("slugifyBlogUrl", () => {
  it("creates a lowercase hyphenated slug", () => {
    expect(slugifyBlogUrl("The Grand Dukes Castle")).toBe(
      "the-grand-dukes-castle",
    );
  });
});

describe("isPublicBlog", () => {
  it("hides draft and hidden posts", () => {
    expect(
      isPublicBlog({ blog_title: "A", tags: "Draft1" }),
    ).toBe(false);
    expect(isPublicBlog({ blog_title: "A", tags: "Hidden" })).toBe(false);
    expect(isPublicBlog({ blog_title: "A", tags: "" })).toBe(true);
  });
});

describe("canAccessBlog", () => {
  it("keeps hidden posts private unless unlisted access is allowed", () => {
    const hidden = { blog_title: "A", tags: "Hidden" };
    expect(canAccessBlog(hidden)).toBe(false);
    expect(canAccessBlog(hidden, { allowUnlisted: true })).toBe(true);
    expect(canAccessBlog({ blog_title: "A", tags: "" })).toBe(true);
    expect(
      canAccessBlog({ blog_title: "", tags: "Hidden" }, { allowUnlisted: true }),
    ).toBe(false);
  });
});

describe("briefBlogDescription", () => {
  it("truncates long descriptions", () => {
    const long = "a".repeat(200);
    expect(briefBlogDescription(long, 50).endsWith("…")).toBe(true);
    expect(briefBlogDescription(long, 50).length).toBeLessThanOrEqual(50);
  });

  it("omits markdown image URLs from the excerpt", () => {
    expect(
      briefBlogDescription(
        "Hello ![Budapest](https://example.com/a.jpg) there",
        160,
      ),
    ).toBe("Hello Budapest there");
  });
});

describe("blogWriteSchema", () => {
  const valid = {
    name: "Hungary",
    date_of_first_visit: "01/2013",
    date_of_story: "02/2024",
    url: "hungary",
    blog_title: "Budasesh",
    blog_description: "A trip note",
    tags: "",
    image_url: "https://example.com/cover.jpg",
  };

  it("accepts a valid blog", () => {
    expect(blogWriteSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults date of story when omitted", () => {
    const { date_of_story: _omitted, ...withoutStoryDate } = valid;
    const parsed = blogWriteSchema.safeParse(withoutStoryDate);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.date_of_story).toBe("");
    }
  });

  it("rejects invalid slugs", () => {
    expect(
      blogWriteSchema.safeParse({ ...valid, url: "Hungary Place" }).success,
    ).toBe(false);
  });

  it("accepts an empty or valid title image URL", () => {
    expect(
      blogWriteSchema.safeParse({ ...valid, image_url: "" }).success,
    ).toBe(true);
    expect(
      blogWriteSchema.safeParse({
        ...valid,
        image_url: "https://example.com/cover.jpg",
      }).success,
    ).toBe(true);
    expect(
      blogWriteSchema.safeParse({
        ...valid,
        image_url: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });
});

describe("toBlogDocument", () => {
  it("maps write input to the Mongo shape", () => {
    expect(
      toBlogDocument({
        name: "Hungary",
        date_of_first_visit: "01/2013",
        date_of_story: "02/2024",
        url: "hungary",
        blog_title: "Budasesh",
        blog_description: "A trip note",
        tags: "",
        image_url: "https://example.com/cover.jpg",
      }),
    ).toEqual({
      name: "Hungary",
      date_of_first_visit: "01/2013",
      date_of_story: "02/2024",
      url: "hungary",
      blog_title: "Budasesh",
      blog_description: "A trip note",
      tags: "",
      image_url: "https://example.com/cover.jpg",
    });
  });
});
