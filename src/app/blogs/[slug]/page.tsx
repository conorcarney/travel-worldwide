import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublicBlogBySlug } from "@/lib/blog-pages";

type BlogDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await loadPublicBlogBySlug(slug);
  if (!blog) {
    return { title: "Blog not found" };
  }
  return {
    title: blog.blog_title,
    description: blog.blog_description.slice(0, 160),
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const blog = await loadPublicBlogBySlug(slug);
  if (!blog) notFound();

  const paragraphs = blog.blog_description
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
      <Link
        href="/blogs"
        className="text-sm text-muted transition-colors hover:text-foreground"
      >
        ← All blogs
      </Link>

      <article className="mt-6">
        <p className="text-xs uppercase tracking-wide text-muted">
          {blog.name}
          {blog.date_of_first_visit ? ` · ${blog.date_of_first_visit}` : ""}
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground sm:text-5xl">
          {blog.blog_title}
        </h1>
        <div className="mt-8 space-y-4 text-base leading-relaxed text-foreground/90">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
