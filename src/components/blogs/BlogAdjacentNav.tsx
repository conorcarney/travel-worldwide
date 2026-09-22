import Link from "next/link";
import { BlogCoverImage } from "@/components/blogs/BlogCoverImage";
import type { BlogRecord } from "@/lib/validations/blog-write";

function AdjacentCard({
  blog,
  direction,
}: {
  blog: BlogRecord;
  direction: "previous" | "next";
}) {
  const isPrevious = direction === "previous";

  return (
    <Link
      href={`/blogs/${blog.url}`}
      className={`flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface/60 p-3 transition-colors hover:bg-surface ${
        isPrevious ? "" : "sm:flex-row-reverse sm:text-right"
      }`}
      data-testid={`blog-${direction}`}
    >
      <span className="text-xl text-muted" aria-hidden>
        {isPrevious ? "←" : "→"}
      </span>
      <BlogCoverImage
        src={blog.image_url}
        alt=""
        className="h-16 w-16 shrink-0 rounded-md border border-border object-cover"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-xs uppercase tracking-wide text-muted">
          {isPrevious ? "Previous" : "Next"}
        </span>
        <span className="mt-1 block truncate font-display text-lg text-foreground">
          {blog.blog_title}
        </span>
        <span className="mt-0.5 block truncate text-xs uppercase tracking-wide text-muted">
          {blog.name}
        </span>
      </span>
    </Link>
  );
}

export function BlogAdjacentNav({
  previous,
  next,
}: {
  previous: BlogRecord | null;
  next: BlogRecord | null;
}) {
  if (!previous && !next) return null;

  return (
    <nav
      className="mt-12 grid gap-4 sm:grid-cols-2"
      aria-label="Nearby posts"
      data-testid="blog-adjacent-nav"
    >
      {previous ? (
        <AdjacentCard blog={previous} direction="previous" />
      ) : (
        <div className="hidden sm:block" />
      )}
      {next ? <AdjacentCard blog={next} direction="next" /> : null}
    </nav>
  );
}
