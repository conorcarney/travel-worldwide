import type { Metadata } from "next";
import { BlogIndex } from "@/components/blogs/BlogIndex";
import { loadPublicBlogs } from "@/lib/blog-pages";

export const metadata: Metadata = {
  title: "Blogs",
  description: "Travel notes and stories from the road.",
};

export default async function BlogsPage() {
  const blogs = await loadPublicBlogs();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl tracking-tight text-foreground">
        Blogs
      </h1>
      <p className="mt-3 text-muted">
        Titles and short notes from places on the map. Open a post to read the
        full story.
      </p>

      <BlogIndex blogs={blogs} />

      {blogs.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No published blogs yet.</p>
      ) : null}
    </main>
  );
}
