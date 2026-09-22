"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BlogCoverImage } from "@/components/blogs/BlogCoverImage";
import {
  BLOG_SORT_OPTIONS,
  DEFAULT_BLOG_SORT,
  defaultBlogSortDirection,
  isDateBlogSortKey,
  sortBlogs,
  type BlogSortKey,
} from "@/lib/blog-sort";
import {
  briefBlogDescription,
  type BlogRecord,
} from "@/lib/validations/blog-write";
import type { SortState } from "@/lib/admin/table-sort";

function directionLabel(sort: SortState<BlogSortKey>): string {
  if (isDateBlogSortKey(sort.key)) {
    return sort.direction === "desc" ? "Newest first" : "Oldest first";
  }
  return sort.direction === "asc" ? "A–Z" : "Z–A";
}

export function BlogIndex({ blogs }: { blogs: BlogRecord[] }) {
  const [sort, setSort] = useState<SortState<BlogSortKey>>(DEFAULT_BLOG_SORT);
  const sorted = useMemo(() => sortBlogs(blogs, sort), [blogs, sort]);

  if (blogs.length === 0) return null;

  return (
    <>
      <div className="mt-8 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Sort by
          <select
            className="rounded border border-border bg-background px-3 py-2 text-foreground"
            value={sort.key}
            autoComplete="off"
            onChange={(event) => {
              const key = event.target.value as BlogSortKey;
              setSort({ key, direction: defaultBlogSortDirection(key) });
            }}
            data-testid="blog-sort"
          >
            {BLOG_SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-2 text-sm text-foreground"
          onClick={() =>
            setSort((current) => ({
              ...current,
              direction: current.direction === "asc" ? "desc" : "asc",
            }))
          }
          data-testid="blog-sort-direction"
        >
          {directionLabel(sort)}
        </button>
      </div>

      <ul
        className="mt-6 divide-y divide-border border-y border-border"
        data-testid="blog-list"
      >
        {sorted.map((blog) => (
          <li key={blog._id}>
            <Link
              href={`/blogs/${blog.url}`}
              className="flex gap-4 py-5 transition-colors hover:bg-surface/50"
            >
              <BlogCoverImage
                src={blog.image_url}
                alt=""
                className="h-24 w-32 shrink-0 rounded-lg border border-border object-cover"
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl text-foreground">
                  {blog.blog_title}
                </h2>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                  {blog.name}
                  {blog.date_of_story
                    ? ` · ${blog.date_of_story}`
                    : blog.date_of_first_visit
                      ? ` · ${blog.date_of_first_visit}`
                      : ""}
                </p>
                {blog.tags ? (
                  <p className="mt-1 text-xs text-muted">{blog.tags}</p>
                ) : null}
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {briefBlogDescription(blog.blog_description)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
