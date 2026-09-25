import { buildRobotsTxt } from "@/lib/agent/robots-txt";
import { originFromRequest } from "@/lib/agent/site-origin";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return new Response(buildRobotsTxt(originFromRequest(request)), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
