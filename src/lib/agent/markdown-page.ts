import { briefBlogDescription } from "@/lib/validations/blog-write";
import { loadBlogBySlug, loadPublicBlogs } from "@/lib/blog-pages";
import { PUBLIC_READ_ENDPOINTS } from "@/lib/agent/public-api";

function normalizePath(path: string): string | null {
  if (!path.startsWith("/") || path.includes("\\") || path.includes("..")) return null;
  const pathname = path.split("?")[0]?.split("#")[0] ?? "/";
  if (pathname.includes("://")) return null;
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function apiDocsMarkdown(origin: string): string {
  const lines = PUBLIC_READ_ENDPOINTS.map(
    (endpoint) => `- \`GET ${endpoint.path}\` — ${endpoint.summary}`,
  );
  return [
    "# API documentation",
    "",
    "Public read endpoints. Responses are JSON with `ok`, `source`, and `data`. No credential is required.",
    "",
    `Machine-readable description: ${origin}/openapi.json`,
    "",
    ...lines,
    "",
    "Write requests and `/admin` require a human session from `/login`.",
  ].join("\n");
}

export async function renderAgentMarkdown(
  rawPath: string,
  origin: string,
): Promise<{ status: number; body: string }> {
  const path = normalizePath(rawPath);
  if (!path) {
    return { status: 404, body: "# Not found\n\nThat path is not available.\n" };
  }

  if (path === "/") {
    return {
      status: 200,
      body: [
        "# AhBeGrand",
        "",
        "A personal travel site for visited countries, routes, flights, and blogs.",
        "",
        "The name AhBeGrand is a rule of thumb for travelling and daily life: it will be fine, and what is the worst that could happen?",
        "",
        "The site is built with Next.js, React, and MongoDB. Photos and videos are stored in S3. Statistics update from the recorded trips. Data is still entered by hand.",
        "",
        `- [Map](${origin}/map)`,
        `- [Statistics](${origin}/stats)`,
        `- [Blogs](${origin}/blogs)`,
        `- [Contact](${origin}/contact)`,
        `- [API documentation](${origin}/docs/api)`,
        "",
      ].join("\n"),
    };
  }

  if (path === "/map") {
    return {
      status: 200,
      body: [
        "# Map",
        "",
        "Interactive map of visited countries, flights, land routes, buses, trains, ferries, and bookmarks. Use the filters on the page to narrow the journey.",
        "",
        `Recorded data is also available from the public read API: ${origin}/docs/api`,
        "",
      ].join("\n"),
    };
  }

  if (path === "/stats") {
    return {
      status: 200,
      body: [
        "# Statistics",
        "",
        "Charts and checklists for the recorded trips, including country ratings and the Passat road trip. Figures are derived from the same collections as the map.",
        "",
      ].join("\n"),
    };
  }

  if (path === "/contact") {
    return {
      status: 200,
      body: [
        "# Contact",
        "",
        "The contact page has a form for a person to send a message. Agents should read the public pages and API instead of submitting the form.",
        "",
      ].join("\n"),
    };
  }

  if (path === "/login") {
    return {
      status: 200,
      body: [
        "# Sign in",
        "",
        "Human operators sign in here to open `/admin`. This is not an agent registration endpoint and it does not issue an OAuth token.",
        "",
      ].join("\n"),
    };
  }

  if (path === "/docs/api") {
    return { status: 200, body: `${apiDocsMarkdown(origin)}\n` };
  }

  if (path === "/blogs") {
    try {
      const blogs = await loadPublicBlogs();
      const items = blogs.map((blog) => {
        const brief = briefBlogDescription(blog.blog_description, 140);
        return `- [${blog.blog_title}](${origin}/blogs/${blog.url}) — ${brief}`;
      });
      return {
        status: 200,
        body: ["# Blogs", "", "Published travel notes.", "", ...items, ""].join("\n"),
      };
    } catch {
      return {
        status: 200,
        body: "# Blogs\n\nPublished travel notes are temporarily unavailable.\n",
      };
    }
  }

  if (path.startsWith("/blogs/")) {
    const slug = decodeURIComponent(path.slice("/blogs/".length));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return { status: 404, body: "# Not found\n\nThat blog was not found.\n" };
    }
    try {
      const blog = await loadBlogBySlug(slug);
      if (!blog) {
        return { status: 404, body: "# Not found\n\nThat blog was not found.\n" };
      }
      return {
        status: 200,
        body: [
          `# ${blog.blog_title}`,
          "",
          [blog.name, blog.date_of_story || blog.date_of_first_visit]
            .filter(Boolean)
            .join(" · "),
          "",
          blog.blog_description.trim(),
          "",
        ].join("\n"),
      };
    } catch {
      return {
        status: 503,
        body: "# Unavailable\n\nThat blog could not be loaded.\n",
      };
    }
  }

  if (path.startsWith("/admin")) {
    return {
      status: 200,
      body: "# Admin\n\nThis area is for the human operator. It is not published for agents.\n",
    };
  }

  return { status: 404, body: "# Not found\n\nThat page is not published.\n" };
}
