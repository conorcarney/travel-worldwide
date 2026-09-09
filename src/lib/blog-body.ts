export type BlogBodyPart =
  | { type: "text"; value: string }
  | { type: "image"; src: string; alt: string };

export type BlogBodyBlock =
  | { type: "paragraph"; parts: BlogBodyPart[] }
  | { type: "image"; src: string; alt: string };

const IMAGE_MARKDOWN =
  /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?\s*(?:"([^"]*)")?\s*\)/g;
const STANDALONE_IMAGE_URL =
  /^https?:\/\/[^\s)]+\.(?:jpe?g|png|webp|gif|avif)(?:\?[^\s)]*)?$/i;

export function isSafeBlogImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function parseLine(line: string): BlogBodyPart[] {
  const parts: BlogBodyPart[] = [];
  const pattern = new RegExp(IMAGE_MARKDOWN.source, "g");
  let lastIndex = 0;
  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: line.slice(lastIndex, index) });
    }
    const alt = match[1]?.trim() ?? "";
    const src = match[2]?.trim() ?? "";
    if (isSafeBlogImageUrl(src)) {
      parts.push({ type: "image", src, alt });
    } else {
      parts.push({ type: "text", value: match[0] });
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < line.length) {
    parts.push({ type: "text", value: line.slice(lastIndex) });
  }
  return parts;
}

export function parseBlogBody(description: string): BlogBodyBlock[] {
  const blocks: BlogBodyBlock[] = [];
  for (const raw of description.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    if (STANDALONE_IMAGE_URL.test(line) && isSafeBlogImageUrl(line)) {
      blocks.push({ type: "image", src: line, alt: "" });
      continue;
    }
    const parts = parseLine(line);
    if (parts.length === 0) continue;

    const images = parts.filter((part) => part.type === "image");
    const hasText = parts.some(
      (part) => part.type === "text" && part.value.trim(),
    );
    if (!hasText && images.length === 1) {
      const image = images[0];
      if (image.type === "image") {
        blocks.push({ type: "image", src: image.src, alt: image.alt });
        continue;
      }
    }
    blocks.push({ type: "paragraph", parts });
  }
  return blocks;
}

/** Drop markdown image syntax so listings and metadata stay readable. */
export function stripBlogMarkdown(description: string): string {
  return description
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(
      /https?:\/\/[^\s)]+\.(?:jpe?g|png|webp|gif|avif)(?:\?[^\s)]*)?/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}
