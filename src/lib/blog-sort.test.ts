import { describe, expect, it } from "vitest";
import {
  adjacentBlogs,
  blogCreatedAtMs,
  blogsForAdjacentNav,
  defaultBlogSortDirection,
  objectIdCreatedAtMs,
  sortBlogs,
} from "@/lib/blog-sort";
import type { BlogRecord } from "@/lib/validations/blog-write";

function blog(partial: Partial<BlogRecord> & Pick<BlogRecord, "_id" | "blog_title">): BlogRecord {
  return {
    name: "Ireland",
    date_of_first_visit: "06/2018",
    date_of_story: "",
    url: partial._id,
    blog_description: "Note",
    tags: "",
    image_url: "",
    ...partial,
  };
}

describe("defaultBlogSortDirection", () => {
  it("uses newest-first for dates and A-Z for text", () => {
    expect(defaultBlogSortDirection("story")).toBe("desc");
    expect(defaultBlogSortDirection("visited")).toBe("desc");
    expect(defaultBlogSortDirection("created")).toBe("desc");
    expect(defaultBlogSortDirection("title")).toBe("asc");
    expect(defaultBlogSortDirection("country")).toBe("asc");
    expect(defaultBlogSortDirection("tags")).toBe("asc");
  });
});

describe("blogCreatedAtMs", () => {
  it("prefers created_at and falls back to ObjectId time", () => {
    expect(
      blogCreatedAtMs({
        _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
        created_at: "2024-02-01T00:00:00.000Z",
      }),
    ).toBe(Date.parse("2024-02-01T00:00:00.000Z"));

    const id = "65c2a1000000000000000000";
    expect(blogCreatedAtMs({ _id: id })).toBe(objectIdCreatedAtMs(id));
    expect(objectIdCreatedAtMs(id)).toBe(0x65c2a100 * 1000);
  });
});

describe("sortBlogs", () => {
  const rows = [
    blog({
      _id: "older",
      blog_title: "Zebra",
      name: "Hungary",
      date_of_first_visit: "01/2013",
      date_of_story: "03/2020",
      created_at: "2020-03-01T00:00:00.000Z",
      tags: "Europe",
    }),
    blog({
      _id: "newer",
      blog_title: "Alpha",
      name: "New Zealand",
      date_of_first_visit: "08/2017",
      date_of_story: "02/2024",
      created_at: "2024-02-01T00:00:00.000Z",
      tags: "Oceania",
    }),
    blog({
      _id: "middle",
      blog_title: "Mid",
      name: "Ireland",
      date_of_first_visit: "06/2018",
      date_of_story: "",
      created_at: "2021-06-01T00:00:00.000Z",
      tags: "Home",
    }),
  ];

  it("defaults to date of story, most recent first", () => {
    expect(sortBlogs(rows).map((row) => row._id)).toEqual([
      "newer",
      "older",
      "middle",
    ]);
  });

  it("falls back to first visit when story date is missing", () => {
    const withFallback = [
      blog({
        _id: "recent-visit",
        blog_title: "Recent visit only",
        date_of_first_visit: "01/2023",
        date_of_story: "",
      }),
      ...rows,
    ];
    expect(sortBlogs(withFallback).map((row) => row._id)).toEqual([
      "newer",
      "recent-visit",
      "older",
      "middle",
    ]);
  });

  it("sorts by title, country, tags, first visit, and created date", () => {
    expect(
      sortBlogs(rows, { key: "title", direction: "asc" }).map((row) => row.blog_title),
    ).toEqual(["Alpha", "Mid", "Zebra"]);

    expect(
      sortBlogs(rows, { key: "country", direction: "asc" }).map((row) => row.name),
    ).toEqual(["Hungary", "Ireland", "New Zealand"]);

    expect(
      sortBlogs(rows, { key: "tags", direction: "asc" }).map((row) => row.tags),
    ).toEqual(["Europe", "Home", "Oceania"]);

    expect(
      sortBlogs(rows, { key: "visited", direction: "desc" }).map((row) => row._id),
    ).toEqual(["middle", "newer", "older"]);

    expect(
      sortBlogs(rows, { key: "created", direction: "desc" }).map((row) => row._id),
    ).toEqual(["newer", "middle", "older"]);

    expect(
      sortBlogs(rows, { key: "slug", direction: "asc" }).map((row) => row.url),
    ).toEqual(["middle", "newer", "older"]);
  });
});

describe("adjacentBlogs", () => {
  it("returns previous and next posts in list order", () => {
    const rows = [
      blog({ _id: "a", blog_title: "A" }),
      blog({ _id: "b", blog_title: "B" }),
      blog({ _id: "c", blog_title: "C" }),
    ];
    expect(adjacentBlogs(rows, "b")).toEqual({
      previous: rows[0],
      next: rows[2],
    });
    expect(adjacentBlogs(rows, "a").previous).toBeNull();
    expect(adjacentBlogs(rows, "c").next).toBeNull();
  });

  it("inserts a hidden post into the public line for next/previous", () => {
    const publicRows = [
      blog({
        _id: "newer",
        blog_title: "Newer",
        date_of_story: "02/2024",
      }),
      blog({
        _id: "older",
        blog_title: "Older",
        date_of_story: "03/2020",
      }),
    ];
    const hidden = blog({
      _id: "hidden",
      blog_title: "Hidden",
      date_of_story: "01/2023",
    });
    const line = blogsForAdjacentNav(hidden, publicRows);
    expect(line.map((row) => row._id)).toEqual(["newer", "hidden", "older"]);
    expect(adjacentBlogs(line, "hidden")).toEqual({
      previous: line[0],
      next: line[2],
    });
  });
});
