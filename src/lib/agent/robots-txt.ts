/** Crawlers that need an explicit group. A lone User-agent: * is not enough. */
export const AI_CRAWLER_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "Claude-Web",
  "Google-Extended",
  "Amazonbot",
  "anthropic-ai",
  "Bytespider",
  "CCBot",
  "Applebot-Extended",
] as const;

/**
 * Public travel notes may be indexed and quoted. They are not offered for
 * model training. Admin, sign-in, and machine endpoints stay out of crawls.
 */
export const CONTENT_SIGNAL = "Content-Signal: ai-train=no, search=yes, ai-input=yes";

const PRIVATE_PREFIXES = ["/admin", "/login", "/api", "/oauth", "/mcp"] as const;

function group(userAgent: string): string {
  return [
    `User-agent: ${userAgent}`,
    "Allow: /",
    ...PRIVATE_PREFIXES.map((prefix) => `Disallow: ${prefix}`),
    CONTENT_SIGNAL,
  ].join("\n");
}

export function buildRobotsTxt(origin: string): string {
  const groups = ["*", ...AI_CRAWLER_AGENTS].map(group);
  return [
    ...groups,
    `Sitemap: ${origin}/sitemap.xml`,
    `Agentmap: ${origin}/.well-known/ai-catalog.json`,
    "",
  ].join("\n\n");
}
