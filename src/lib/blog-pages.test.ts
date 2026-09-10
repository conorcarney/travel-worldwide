import { afterEach, describe, expect, it, vi } from "vitest";

const hiddenBlog = {
  _id: "hidden-1",
  name: "Hungary",
  date_of_first_visit: "01/2013",
  url: "hidden-castle",
  blog_title: "Secret castle",
  blog_description: "Not public yet.",
  tags: "Hidden",
};

const publicBlog = {
  _id: "public-1",
  name: "Ireland",
  date_of_first_visit: "06/2018",
  url: "ireland",
  blog_title: "First trip notes",
  blog_description: "Public notes.",
  tags: "",
};

describe("loadBlogBySlug", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/fixtures");
  });

  it("returns hidden posts only when unlisted access is allowed", async () => {
    vi.stubEnv("ATLAS_URI", "");
    vi.stubEnv("MONGODB_URI", "");
    vi.doMock("@/lib/fixtures", () => ({
      fixtures: { blogs: [publicBlog, hiddenBlog] },
    }));

    const { loadBlogBySlug, loadPublicBlogs } = await import("@/lib/blog-pages");

    await expect(loadBlogBySlug("hidden-castle")).resolves.toBeNull();
    await expect(
      loadBlogBySlug("hidden-castle", { allowUnlisted: true }),
    ).resolves.toMatchObject({ url: "hidden-castle" });
    await expect(loadBlogBySlug("ireland")).resolves.toMatchObject({
      url: "ireland",
    });

    const listed = await loadPublicBlogs();
    expect(listed.map((blog) => blog.url)).toEqual(["ireland"]);
  });
});
