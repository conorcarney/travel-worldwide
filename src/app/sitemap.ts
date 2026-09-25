import type { MetadataRoute } from "next";
import { loadPublicBlogs } from "@/lib/blog-pages";
import { originFromRequest } from "@/lib/agent/site-origin";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const STATIC_PATHS = ["/", "/map", "/stats", "/blogs", "/contact", "/docs/api"] as const;

async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  return originFromRequest(
    new Request("http://localhost", {
      headers: headerList,
    }),
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await requestOrigin();
  const pages: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: path === "/" ? `${origin}/` : `${origin}${path}`,
    changeFrequency: path === "/blogs" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));

  try {
    const blogs = await loadPublicBlogs();
    for (const blog of blogs) {
      pages.push({
        url: `${origin}/blogs/${blog.url}`,
        lastModified: blog.created_at ? new Date(blog.created_at) : undefined,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {
    return pages;
  }

  return pages;
}
