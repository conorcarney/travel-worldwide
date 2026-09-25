import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildAgentSkillsIndex,
  buildAiCatalog,
  buildApiCatalog,
  buildAuthMarkdown,
  buildMcpServerCard,
  buildOauthAuthorizationServer,
  buildOauthProtectedResource,
} from "@/lib/agent/discovery";
import { HOMEPAGE_LINK_HEADER } from "@/lib/agent/link-header";
import { renderAgentMarkdown } from "@/lib/agent/markdown-page";
import { AI_CRAWLER_AGENTS, buildRobotsTxt, CONTENT_SIGNAL } from "@/lib/agent/robots-txt";
import { BROWSE_SKILL_MD, browseSkillDigest, estimateMarkdownTokens } from "@/lib/agent/skill-md";
import { hostnameFromOrigin, originFromRequest } from "@/lib/agent/site-origin";
import { WEB_MCP_BOOTSTRAP } from "@/lib/agent/webmcp-bootstrap";

const origin = "https://travel.example";

describe("agent discovery documents", () => {
  it("builds robots.txt with AI crawlers, content signals, and the sitemap", () => {
    const robots = buildRobotsTxt(origin);
    expect(robots).toContain("User-agent: *");
    for (const agent of AI_CRAWLER_AGENTS) {
      expect(robots).toContain(`User-agent: ${agent}`);
    }
    expect(robots).toContain(CONTENT_SIGNAL);
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain(`Sitemap: ${origin}/sitemap.xml`);
    expect(robots).toContain(`Agentmap: ${origin}/.well-known/ai-catalog.json`);
  });

  it("points the homepage Link header at discovery resources", () => {
    expect(HOMEPAGE_LINK_HEADER).toContain('rel="api-catalog"');
    expect(HOMEPAGE_LINK_HEADER).toContain('rel="service-desc"');
    expect(HOMEPAGE_LINK_HEADER).toContain('rel="service-doc"');
    expect(HOMEPAGE_LINK_HEADER).toContain('rel="describedby"');
  });

  it("publishes an API catalog linkset", () => {
    const catalog = buildApiCatalog(origin);
    expect(catalog.linkset[0]?.anchor).toBe(`${origin}/api`);
    expect(catalog.linkset[0]?.["service-desc"][0]?.href).toBe(`${origin}/openapi.json`);
    expect(catalog.linkset[0]?.["service-doc"][0]?.href).toBe(`${origin}/docs/api`);
    expect(catalog.linkset[0]?.status[0]?.href).toBe(`${origin}/api/health`);
  });

  it("publishes OAuth discovery fields and points registration at auth.md", () => {
    const server = buildOauthAuthorizationServer(origin);
    const resource = buildOauthProtectedResource(origin);
    expect(server.issuer).toBe(origin);
    expect(resource.authorization_servers).toEqual([server.issuer]);
    expect(resource.resource).toBe(`${origin}/`);
    expect(server.authorization_endpoint).toBe(`${origin}/oauth/authorize`);
    expect(server.token_endpoint).toBe(`${origin}/oauth/token`);
    expect(server.jwks_uri).toBe(`${origin}/.well-known/jwks.json`);
    expect(server.grant_types_supported.length).toBeGreaterThan(0);
    expect(server.response_types_supported.length).toBeGreaterThan(0);
    expect(server.agent_auth.register_uri).toBe(`${origin}/auth.md`);
    expect(server._comment).toMatch(/does not issue OAuth access tokens/);
    expect(buildAuthMarkdown(origin)).toMatch(/^# auth\.md/);
  });

  it("hashes the browse skill from the bytes that are served", () => {
    const digest = browseSkillDigest();
    const hex = createHash("sha256").update(BROWSE_SKILL_MD).digest("hex");
    expect(digest).toBe(`sha256:${hex}`);
    const index = buildAgentSkillsIndex(origin);
    expect(index.$schema).toBe("https://schemas.agentskills.io/discovery/0.2.0/schema.json");
    expect(index.skills[0]).toMatchObject({
      name: "browse-ahbegrand",
      type: "skill-md",
      digest,
      url: `${origin}/.well-known/agent-skills/browse-ahbegrand/SKILL.md`,
    });
  });

  it("describes the MCP server and the ARD catalog", () => {
    expect(buildMcpServerCard(origin).serverInfo).toEqual({
      name: "AhBeGrand",
      version: "1.0.1",
    });
    expect(buildMcpServerCard(origin).capabilities).toContain("tools");
    const catalog = buildAiCatalog(origin);
    expect(catalog.specVersion).toBe("1.0");
    expect(catalog.host.displayName).toBe("AhBeGrand");
    expect(catalog.entries).toHaveLength(3);
    for (const entry of catalog.entries) {
      expect(entry.identifier.startsWith("urn:air:travel.example:")).toBe(true);
      expect(entry.representativeQueries.length).toBeGreaterThanOrEqual(2);
      expect(entry.representativeQueries.length).toBeLessThanOrEqual(5);
      expect(entry.url).toBeTruthy();
      expect("data" in entry).toBe(false);
    }
  });

  it("reads the request origin from forwarded headers", () => {
    const request = new Request("http://localhost:3000/", {
      headers: {
        "x-forwarded-host": "travel.example",
        "x-forwarded-proto": "https",
      },
    });
    const resolved = originFromRequest(request);
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      expect(resolved).not.toMatch(/\/$/);
    } else {
      expect(resolved).toBe("https://travel.example");
    }
    expect(hostnameFromOrigin("https://travel.example")).toBe("travel.example");
  });

  it("renders homepage markdown and a token estimate", async () => {
    const page = await renderAgentMarkdown("/", origin);
    expect(page.status).toBe(200);
    expect(page.body).toContain("# AhBeGrand");
    expect(estimateMarkdownTokens(page.body)).toBeGreaterThan(1);
  });

  it("registers WebMCP tools on page load", () => {
    expect(WEB_MCP_BOOTSTRAP).toContain("navigator");
    expect(WEB_MCP_BOOTSTRAP).toContain("provideContext");
    expect(WEB_MCP_BOOTSTRAP).toContain("registerTool");
    expect(WEB_MCP_BOOTSTRAP).toContain("AbortController");
    new Function(WEB_MCP_BOOTSTRAP);
  });
});
