import { describe, expect, it } from "vitest";
import { toBlogDocument } from "@/lib/blogs";
import {
  blogWriteSchema,
  briefBlogDescription,
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

describe("briefBlogDescription", () => {
  it("truncates long descriptions", () => {
    const long = "a".repeat(200);
    expect(briefBlogDescription(long, 50).endsWith("…")).toBe(true);
    expect(briefBlogDescription(long, 50).length).toBeLessThanOrEqual(50);
  });
});

describe("blogWriteSchema", () => {
  const valid = {
    name: "Hungary",
    date_of_first_visit: "01/2013",
    url: "hungary",
    blog_title: "Budasesh",
    blog_description: "A trip note",
    tags: "",
  };

  it("accepts a valid blog", () => {
    expect(blogWriteSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(
      blogWriteSchema.safeParse({ ...valid, url: "Hungary Place" }).success,
    ).toBe(false);
  });
});

describe("toBlogDocument", () => {
  it("maps write input to the Mongo shape", () => {
    expect(
      toBlogDocument({
        name: "Hungary",
        date_of_first_visit: "01/2013",
        url: "hungary",
        blog_title: "Budasesh",
        blog_description: "A trip note",
        tags: "",
      }),
    ).toEqual({
      name: "Hungary",
      date_of_first_visit: "01/2013",
      url: "hungary",
      blog_title: "Budasesh",
      blog_description: "A trip note",
      tags: "",
    });
  });
});
