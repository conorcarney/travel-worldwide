import {
  compareSortValues,
  dateSortKey,
  type SortDirection,
  type SortState,
} from "@/lib/admin/table-sort";
import { parseTripDate } from "@/lib/trip-date";
import type { BlogRecord } from "@/lib/validations/blog-write";

export const BLOG_SORT_KEYS = [
  "story",
  "title",
  "country",
  "visited",
  "created",
  "tags",
  "slug",
] as const;

export type BlogSortKey = (typeof BLOG_SORT_KEYS)[number];

export const BLOG_SORT_OPTIONS: { key: BlogSortKey; label: string }[] = [
  { key: "story", label: "Date of story" },
  { key: "title", label: "Title" },
  { key: "country", label: "Country" },
  { key: "visited", label: "Date first visited" },
  { key: "created", label: "Created date" },
  { key: "tags", label: "Tags" },
];

const DATE_SORT_KEYS = new Set<BlogSortKey>(["story", "visited", "created"]);

export const DEFAULT_BLOG_SORT: SortState<BlogSortKey> = {
  key: "story",
  direction: "desc",
};

export function isBlogSortKey(value: string): value is BlogSortKey {
  return (BLOG_SORT_KEYS as readonly string[]).includes(value);
}

export function defaultBlogSortDirection(key: BlogSortKey): SortDirection {
  return DATE_SORT_KEYS.has(key) ? "desc" : "asc";
}

export function isDateBlogSortKey(key: BlogSortKey): boolean {
  return DATE_SORT_KEYS.has(key);
}

/** Mongo ObjectId timestamps live in the first 4 bytes (8 hex chars). */
export function objectIdCreatedAtMs(id: string): number {
  if (!/^[a-fA-F0-9]{24}$/.test(id)) return Number.NaN;
  return parseInt(id.slice(0, 8), 16) * 1000;
}

export function blogCreatedAtMs(blog: {
  _id: string;
  created_at?: string | Date | null;
}): number {
  if (blog.created_at) {
    const timestamp = new Date(blog.created_at).getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return objectIdCreatedAtMs(blog._id);
}

function storyDateValue(blog: BlogRecord): string {
  return (blog.date_of_story || blog.date_of_first_visit || "").trim();
}

function missingDate(value: string): boolean {
  return !parseTripDate(value);
}

function compareBlogDates(
  left: string,
  right: string,
  direction: SortDirection,
): number {
  const leftMissing = missingDate(left);
  const rightMissing = missingDate(right);
  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;
  return compareSortValues(dateSortKey(left), dateSortKey(right), direction);
}

function compareCreated(
  left: BlogRecord,
  right: BlogRecord,
  direction: SortDirection,
): number {
  const leftMs = blogCreatedAtMs(left);
  const rightMs = blogCreatedAtMs(right);
  const leftMissing = !Number.isFinite(leftMs);
  const rightMissing = !Number.isFinite(rightMs);
  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;
  return compareSortValues(leftMs, rightMs, direction);
}

export function sortBlogs(
  blogs: BlogRecord[],
  sort: SortState<BlogSortKey> = DEFAULT_BLOG_SORT,
): BlogRecord[] {
  return [...blogs].sort((left, right) => {
    switch (sort.key) {
      case "title":
        return compareSortValues(
          left.blog_title ?? "",
          right.blog_title ?? "",
          sort.direction,
        );
      case "country":
        return compareSortValues(left.name ?? "", right.name ?? "", sort.direction);
      case "tags":
        return compareSortValues(left.tags ?? "", right.tags ?? "", sort.direction);
      case "slug":
        return compareSortValues(left.url ?? "", right.url ?? "", sort.direction);
      case "visited":
        return compareBlogDates(
          left.date_of_first_visit ?? "",
          right.date_of_first_visit ?? "",
          sort.direction,
        );
      case "created":
        return compareCreated(left, right, sort.direction);
      case "story":
      default:
        return compareBlogDates(
          storyDateValue(left),
          storyDateValue(right),
          sort.direction,
        );
    }
  });
}
