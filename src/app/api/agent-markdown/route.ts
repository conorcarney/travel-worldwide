import { estimateMarkdownTokens } from "@/lib/agent/skill-md";
import { renderAgentMarkdown } from "@/lib/agent/markdown-page";
import { originFromRequest } from "@/lib/agent/site-origin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "/";
  const origin = originFromRequest(request);
  const page = await renderAgentMarkdown(path, origin);

  return new Response(page.body, {
    status: page.status,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "x-markdown-tokens": String(estimateMarkdownTokens(page.body)),
      Vary: "Accept",
      "Cache-Control": "private, no-cache",
    },
  });
}
