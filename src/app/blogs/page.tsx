import type { Metadata } from "next";
import Link from "next/link";
import { loadPublicBlogs } from "@/lib/blog-pages";
import { briefBlogDescription } from "@/lib/validations/blog-write";

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

      <ul className="mt-10 divide-y divide-border border-y border-border">
        {blogs.map((blog) => (
          <li key={blog._id}>
            <Link
              href={`/blogs/${blog.url}`}
              className="block py-5 transition-colors hover:bg-surface/50"
            >
              <h2 className="font-display text-2xl text-foreground">
                {blog.blog_title}
              </h2>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                {blog.name}
                {blog.date_of_first_visit
                  ? ` · ${blog.date_of_first_visit}`
                  : ""}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {briefBlogDescription(blog.blog_description)}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {blogs.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No published blogs yet.</p>
      ) : null}
    </main>
  );
}
