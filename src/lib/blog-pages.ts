import { BlogStoreError, listPublicBlogs, getBlogBySlug } from "@/lib/blogs";
import { fixtures } from "@/lib/fixtures";
import { isMongoConfigured } from "@/lib/mongodb";
import {
  isPublicBlog,
  type BlogRecord,
} from "@/lib/validations/blog-write";

function fixtureBlogs(): BlogRecord[] {
  return fixtures.blogs as BlogRecord[];
}

export async function loadPublicBlogs(): Promise<BlogRecord[]> {
  if (!isMongoConfigured()) {
    return fixtureBlogs().filter(isPublicBlog);
  }

  try {
    return await listPublicBlogs();
  } catch (error) {
    if (error instanceof BlogStoreError) throw error;
    throw error;
  }
}

export async function loadPublicBlogBySlug(
  slug: string,
): Promise<BlogRecord | null> {
  if (!isMongoConfigured()) {
    const match = fixtureBlogs().find((blog) => blog.url === slug) ?? null;
    return match && isPublicBlog(match) ? match : null;
  }

  const blog = await getBlogBySlug(slug);
  if (!blog || !isPublicBlog(blog)) return null;
  return blog;
}
