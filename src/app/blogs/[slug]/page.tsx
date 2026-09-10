import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { BlogBody } from "@/components/blogs/BlogBody";
import { isAdminSession } from "@/lib/authz";
import { stripBlogMarkdown } from "@/lib/blog-body";
import { loadBlogBySlug } from "@/lib/blog-pages";
import { isPublicBlog } from "@/lib/validations/blog-write";

export const dynamic = "force-dynamic";

type BlogDetailPageProps = {
  params: Promise<{ slug: string }>;
};

async function loadBlogForViewer(slug: string) {
  const session = await auth();
  return loadBlogBySlug(slug, { allowUnlisted: isAdminSession(session) });
}

export async function generateMetadata({
  params,
}: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await loadBlogForViewer(slug);
  if (!blog) {
    return { title: "Blog not found" };
  }
  return {
    title: blog.blog_title,
    description: stripBlogMarkdown(blog.blog_description).slice(0, 160),
    ...(isPublicBlog(blog) ? {} : { robots: { index: false, follow: false } }),
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const blog = await loadBlogForViewer(slug);
  if (!blog) notFound();

  const unpublished = !isPublicBlog(blog);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
      <Link
        href="/blogs"
        className="text-sm text-muted transition-colors hover:text-foreground"
      >
        ← All blogs
      </Link>

      {unpublished ? (
        <p className="mt-6 rounded-md border border-border bg-surface/60 px-3 py-2 text-sm text-muted">
          This post is not public. It is visible because you are signed in.
        </p>
      ) : null}

      <article className={unpublished ? "mt-4" : "mt-6"}>
        <p className="text-xs uppercase tracking-wide text-muted">
          {blog.name}
          {blog.date_of_first_visit ? ` · ${blog.date_of_first_visit}` : ""}
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground sm:text-5xl">
          {blog.blog_title}
        </h1>
        <BlogBody description={blog.blog_description} />
      </article>
    </main>
  );
}
