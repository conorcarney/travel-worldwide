const CONFIGURED_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL?.trim();

/** Absolute origin with no trailing slash. Prefers NEXT_PUBLIC_SITE_URL when set. */
export function originFromRequest(request: Request): string {
  if (CONFIGURED_ORIGIN) return CONFIGURED_ORIGIN.replace(/\/$/, "");

  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const host = (forwardedHost ?? hostHeader ?? url.host).split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = (forwardedProto ?? url.protocol.replace(":", "")).split(",")[0]?.trim();
  return `${proto}://${host}`;
}

export function hostnameFromOrigin(origin: string): string {
  return new URL(origin).hostname;
}
