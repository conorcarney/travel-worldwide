import { isSafeBlogImageUrl } from "@/lib/blog-body";

export function BlogCoverImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const url = src?.trim() ?? "";
  if (!isSafeBlogImageUrl(url)) return null;

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
