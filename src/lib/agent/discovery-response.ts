import { buildAuthMarkdown, buildOauthAuthorizationServer, buildOauthProtectedResource, buildApiCatalog, buildAiCatalog, buildAgentSkillsIndex, buildJwks, buildMcpServerCard } from "@/lib/agent/discovery";
import { BROWSE_SKILL_MD } from "@/lib/agent/skill-md";
import { originFromRequest } from "@/lib/agent/site-origin";

function json(body: unknown, headers: HeadersInit = {}, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      ...Object.fromEntries(new Headers(headers)),
    },
  });
}

export function discoveryGet(document: string) {
  return function GET(request: Request) {
    const origin = originFromRequest(request);

    switch (document) {
      case "api-catalog":
        return new Response(JSON.stringify(buildApiCatalog(origin)), {
          headers: {
            "Content-Type": "application/linkset+json",
            "Cache-Control": "public, max-age=300",
          },
        });
      case "oauth-authorization-server":
        return json(buildOauthAuthorizationServer(origin));
      case "oauth-protected-resource":
        return json(buildOauthProtectedResource(origin));
      case "jwks":
        return json(buildJwks());
      case "mcp-server-card":
        return json(buildMcpServerCard(origin));
      case "agent-skills-index":
        return json(buildAgentSkillsIndex(origin));
      case "browse-skill":
        return new Response(BROWSE_SKILL_MD, {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      case "ai-catalog":
        return json(buildAiCatalog(origin), {
          "Access-Control-Allow-Origin": "*",
        });
      case "auth-md":
        return new Response(buildAuthMarkdown(origin), {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      default:
        return json({ ok: false, error: "Not found" }, {}, 404);
    }
  };
}
