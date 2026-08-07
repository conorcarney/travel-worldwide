import { z } from "zod";

export const blogWriteSchema = z.object({
  name: z.string().trim().min(1, "Country name is required"),
  date_of_first_visit: z.string().trim().min(1, "Date is required"),
  url: z
    .string()
    .trim()
    .min(1, "URL slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "URL must be lowercase letters, numbers, and hyphens",
    ),
  blog_title: z.string().trim().min(1, "Title is required"),
  blog_description: z.string().trim().min(1, "Description is required"),
  tags: z.string().trim().optional().default(""),
});

export type BlogWriteInput = z.infer<typeof blogWriteSchema>;

export type BlogRecord = BlogWriteInput & { _id: string };

export function slugifyBlogUrl(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function isPublicBlog(blog: {
  tags?: string | null;
  blog_title?: string | null;
}): boolean {
  if (!blog.blog_title?.trim()) return false;
  const tags = (blog.tags ?? "").toLowerCase();
  if (tags.includes("hidden") || tags.includes("draft")) {
    return false;
  }
  return true;
}

export function briefBlogDescription(
  description: string,
  maxLength = 160,
): string {
  const trimmed = description.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}
