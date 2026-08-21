export const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;

export type TrafficSource =
  | "google"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "direct"
  | "other";

export type TrafficClassification = {
  source: TrafficSource;
  medium: string;
  detail: string;
};

const SOCIAL_MEDIUM = "social";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function gaMeasurementId(
  value = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
): string | null {
  const id = value?.trim() ?? "";
  return GA_MEASUREMENT_ID_PATTERN.test(id) ? id : null;
}

export function isPublicAnalyticsPath(pathname: string): boolean {
  return (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/api")
  );
}

export function pagePath(pathname: string, search: string): string {
  const query = search.startsWith("?") ? search : search ? `?${search}` : "";
  return `${pathname}${query}`;
}

function hostnameFromReferrer(referrer: string): string | null {
  if (!referrer.trim()) return null;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function sourceFromLabel(value: string): TrafficSource | null {
  const label = value.trim().toLowerCase();
  if (!label) return null;
  if (label === "google" || label.startsWith("google_")) return "google";
  if (label.includes("instagram") || label === "ig") return "instagram";
  if (label.includes("tiktok") || label === "tt") return "tiktok";
  if (
    label.includes("facebook") ||
    label === "fb" ||
    label === "meta" ||
    label.includes("fb-")
  ) {
    return "facebook";
  }
  return null;
}

function sourceFromHostname(host: string): TrafficSource | null {
  if (/(^|\.)google\./.test(host) || host === "google.com") return "google";
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
  if (/(^|\.)(facebook\.com|fb\.com|fbcdn\.net|messenger\.com)$/.test(host)) {
    return "facebook";
  }
  return null;
}

export function classifyTrafficSource(input: {
  referrer: string;
  search: string;
}): TrafficClassification {
  const rawSearch = input.search.startsWith("?")
    ? input.search.slice(1)
    : input.search;
  const params = new URLSearchParams(rawSearch);
  const utmSource = params.get("utm_source") ?? "";
  const utmMedium = (params.get("utm_medium") ?? "").toLowerCase();
  const fromUtm = sourceFromLabel(utmSource);
  if (fromUtm) {
    return {
      source: fromUtm,
      medium: utmMedium || (fromUtm === "google" ? "organic" : SOCIAL_MEDIUM),
      detail: utmSource,
    };
  }

  if (params.has("gclid") || params.has("gbraid") || params.has("wbraid")) {
    return { source: "google", medium: utmMedium || "cpc", detail: "gclid" };
  }
  if (params.has("fbclid")) {
    return { source: "facebook", medium: SOCIAL_MEDIUM, detail: "fbclid" };
  }
  if (params.has("ttclid")) {
    return { source: "tiktok", medium: SOCIAL_MEDIUM, detail: "ttclid" };
  }
  if (params.has("igshid") || params.has("igsh")) {
    return { source: "instagram", medium: SOCIAL_MEDIUM, detail: "igsh" };
  }

  const host = hostnameFromReferrer(input.referrer);
  if (!host) {
    return { source: "direct", medium: "(none)", detail: "" };
  }

  const fromHost = sourceFromHostname(host);
  if (fromHost) {
    return {
      source: fromHost,
      medium:
        fromHost === "google"
          ? utmMedium || "organic"
          : utmMedium || SOCIAL_MEDIUM,
      detail: host,
    };
  }

  return { source: "other", medium: "referral", detail: host };
}

export function gtag(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag(...args);
    return;
  }
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(args);
}

export function trackPageView(path: string, title: string): void {
  gtag("event", "page_view", {
    page_path: path,
    page_title: title,
    page_location:
      typeof window === "undefined" ? undefined : window.location.href,
  });
}

export function trackTrafficSource(traffic: TrafficClassification): void {
  gtag("event", "traffic_source", {
    source: traffic.source,
    medium: traffic.medium,
    traffic_detail: traffic.detail,
  });
}

export function trackPageEngagement(input: {
  path: string;
  timeOnPageMs: number;
  reason: "navigate" | "pagehide";
}): void {
  const timeOnPageMs = Math.max(0, Math.round(input.timeOnPageMs));
  gtag("event", "page_engagement", {
    page_path: input.path,
    engagement_time_msec: timeOnPageMs,
    time_on_page_ms: timeOnPageMs,
    engagement_reason: input.reason,
    bounced: timeOnPageMs < 10_000,
    transport_type: "beacon",
  });
}

export function trackMapBlogClick(input: {
  slug: string;
  title: string;
  country: string;
}): void {
  gtag("event", "map_blog_click", {
    blog_slug: input.slug,
    blog_title: input.title,
    country: input.country,
    content_type: "blog",
    item_id: input.slug,
  });
}
