export type TripMediaKind = "image" | "video" | "youtube" | "vimeo";

export type TripMediaItem = {
  url: string;
  kind: TripMediaKind;
  embedUrl?: string;
};

const IMAGE_EXT = /\.(avif|bmp|gif|jpe?g|png|webp)(\?|#|$)/i;
const VIDEO_EXT = /\.(m4v|mov|mp4|ogv|webm)(\?|#|$)/i;

export const TRIP_MEDIA_HINT =
  "Upload files above, or paste one URL per line (YouTube, Vimeo, or a public file).";

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const fromQuery = url.searchParams.get("v");
    if (fromQuery) return fromQuery;
    const match = url.pathname.match(/\/(?:embed|shorts)\/([^/]+)/);
    return match?.[1] ?? null;
  }
  return null;
}

function vimeoId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
  const match = url.pathname.match(/\/(?:video\/)?(\d+)/);
  return match?.[1] ?? null;
}

export function parseMediaUrls(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      if (part.startsWith("/")) return true;
      try {
        const url = new URL(part);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    });
}

export function classifyTripMedia(url: string): TripMediaItem {
  if (url.startsWith("/")) {
    return {
      url,
      kind: VIDEO_EXT.test(url) ? "video" : "image",
    };
  }

  try {
    const parsed = new URL(url);
    const yt = youtubeId(parsed);
    if (yt) {
      return {
        url,
        kind: "youtube",
        embedUrl: `https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&rel=0&playsinline=1`,
      };
    }
    const vimeo = vimeoId(parsed);
    if (vimeo) {
      return {
        url,
        kind: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${vimeo}?autoplay=1&muted=1`,
      };
    }
    if (VIDEO_EXT.test(parsed.pathname)) {
      return { url, kind: "video" };
    }
  } catch {
    // Fall through to image.
  }

  if (VIDEO_EXT.test(url)) return { url, kind: "video" };
  if (IMAGE_EXT.test(url) || url.startsWith("/")) return { url, kind: "image" };
  return { url, kind: "image" };
}

export function parseTripMedia(value: string | undefined): TripMediaItem[] {
  return parseMediaUrls(value ?? "").map(classifyTripMedia);
}

export function mediaCountLabel(value: string | undefined): string {
  const count = parseTripMedia(value).length;
  if (count === 0) return "—";
  return count === 1 ? "1 file" : `${count} files`;
}
