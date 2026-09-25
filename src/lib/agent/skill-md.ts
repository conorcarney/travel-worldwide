import { createHash } from "node:crypto";

/** Served bytes of the browse skill. The index digest is the SHA-256 of this string. */
export const BROWSE_SKILL_MD = `# browse-ahbegrand

Use this skill to read the AhBeGrand travel site.

## Pages

- \`/\` explains the site and links to the map, statistics, and blogs.
- \`/map\` is the interactive travel map.
- \`/stats\` shows travel statistics.
- \`/blogs\` lists published stories. Each story is \`/blogs/{slug}\`.
- \`/contact\` is the human contact form.
- \`/docs/api\` documents the public read API.

## Markdown

Send \`Accept: text/markdown\` on a public HTML URL. The response uses \`Content-Type: text/markdown\` and includes \`x-markdown-tokens\`.

## Data

Public collections are GET-only and do not require a credential. Start at \`/openapi.json\` or \`/.well-known/api-catalog\`.

## Limits

Do not request \`/admin\`, \`/login\`, or write APIs. Those are for the human operator. The site does not issue OAuth access tokens and does not register agent accounts.
`;

export function browseSkillDigest(): string {
  const hex = createHash("sha256").update(BROWSE_SKILL_MD).digest("hex");
  return `sha256:${hex}`;
}

export function estimateMarkdownTokens(markdown: string): number {
  return Math.max(1, Math.ceil(markdown.length / 4));
}
