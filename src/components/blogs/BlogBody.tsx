import { parseBlogBody, type BlogBodyPart } from "@/lib/blog-body";

function BlogImage({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="my-6">
      {/* S3 trip photos are public URLs; native img avoids remote Image config. */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-auto w-full rounded-xl border border-border object-contain"
      />
      {alt ? (
        <figcaption className="mt-2 text-center text-sm text-muted">
          {alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

function ParagraphParts({ parts }: { parts: BlogBodyPart[] }) {
  return (
    <p>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{part.value}</span>;
        }
        return (
          <img
            key={index}
            src={part.src}
            alt={part.alt}
            loading="lazy"
            decoding="async"
            className="my-4 h-auto w-full rounded-xl border border-border object-contain"
          />
        );
      })}
    </p>
  );
}

export function BlogBody({ description }: { description: string }) {
  const blocks = parseBlogBody(description);

  return (
    <div
      className="mt-8 space-y-4 text-base leading-relaxed text-foreground/90"
      data-testid="blog-body"
    >
      {blocks.map((block, index) =>
        block.type === "image" ? (
          <BlogImage key={index} src={block.src} alt={block.alt} />
        ) : (
          <ParagraphParts key={index} parts={block.parts} />
        ),
      )}
    </div>
  );
}
