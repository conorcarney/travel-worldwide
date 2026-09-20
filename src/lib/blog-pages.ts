import { listPublicBlogs, getBlogBySlug } from "@/lib/blogs";
import { sortBlogs } from "@/lib/blog-sort";
import { fixtures } from "@/lib/fixtures";
import { isMongoConfigured } from "@/lib/mongodb";
import {
  canAccessBlog,
  isPublicBlog,
  type BlogRecord,
} from "@/lib/validations/blog-write";

function fixtureBlogs(): BlogRecord[] {
  return fixtures.blogs as BlogRecord[];
}

export async function loadPublicBlogs(): Promise<BlogRecord[]> {
  if (!isMongoConfigured()) {
    return sortBlogs(fixtureBlogs().filter(isPublicBlog));
  }

  return listPublicBlogs();
}

export async function loadBlogBySlug(
  slug: string,
  options: { allowUnlisted?: boolean } = {},
): Promise<BlogRecord | null> {
  const blog = !isMongoConfigured()
    ? (fixtureBlogs().find((entry) => entry.url === slug) ?? null)
    : await getBlogBySlug(slug);

  if (!blog || !canAccessBlog(blog, options)) return null;
  return blog;
}
