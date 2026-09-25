import { buildOpenApiDocument } from "@/lib/agent/public-api";
import { originFromRequest } from "@/lib/agent/site-origin";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return Response.json(buildOpenApiDocument(originFromRequest(request)), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
