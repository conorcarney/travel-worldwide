import { hostnameFromOrigin } from "@/lib/agent/site-origin";
import { browseSkillDigest } from "@/lib/agent/skill-md";

const OAUTH_COMMENT =
  "AhBeGrand does not issue OAuth access tokens. Public travel pages and GET /api collections are readable with no credential. /admin and write APIs use a human Auth.js session created at /login. /oauth/authorize and /oauth/token always return an error so agents do not submit credentials.";

export function buildOauthAuthorizationServer(origin: string) {
  return {
    _comment: OAUTH_COMMENT,
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    jwks_uri: `${origin}/.well-known/jwks.json`,
    grant_types_supported: ["authorization_code"],
    response_types_supported: ["code"],
    scopes_supported: ["public:read"],
    agent_auth: {
      skill: `${origin}/auth.md`,
      register_uri: `${origin}/auth.md`,
      identity_types_supported: ["anonymous"],
      anonymous: {
        credential_types_supported: ["none"],
        claim_uri: `${origin}/auth.md#public-read`,
      },
    },
  };
}

export function buildOauthProtectedResource(origin: string) {
  return {
    resource: `${origin}/`,
    authorization_servers: [origin],
    scopes_supported: ["public:read"],
    bearer_methods_supported: ["header"],
    resource_documentation: `${origin}/auth.md`,
    _comment: OAUTH_COMMENT,
  };
}

export function buildJwks() {
  return { keys: [] as const };
}

export function buildApiCatalog(origin: string) {
  return {
    linkset: [
      {
        anchor: `${origin}/api`,
        "service-desc": [
          {
            href: `${origin}/openapi.json`,
            type: "application/json",
          },
        ],
        "service-doc": [
          {
            href: `${origin}/docs/api`,
            type: "text/html",
          },
        ],
        status: [
          {
            href: `${origin}/api/health`,
            type: "application/json",
          },
        ],
      },
    ],
  };
}

export function buildMcpServerCard(origin: string) {
  return {
    serverInfo: {
      name: "AhBeGrand",
      version: "1.0.1",
    },
    transport: {
      type: "streamable-http",
      endpoint: `${origin}/mcp`,
    },
    capabilities: ["tools"],
  };
}

export function buildAgentSkillsIndex(origin: string) {
  return {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: [
      {
        name: "browse-ahbegrand",
        type: "skill-md",
        description:
          "Read AhBeGrand public pages, request markdown, and call the public travel API.",
        url: `${origin}/.well-known/agent-skills/browse-ahbegrand/SKILL.md`,
        digest: browseSkillDigest(),
      },
    ],
  };
}

export function buildAiCatalog(origin: string) {
  const host = hostnameFromOrigin(origin);
  return {
    specVersion: "1.0",
    host: {
      displayName: "AhBeGrand",
      identifier: `did:web:${host}`,
    },
    entries: [
      {
        identifier: `urn:air:${host}:api:travel-read`,
        displayName: "AhBeGrand public travel API",
        type: "application/json",
        url: `${origin}/openapi.json`,
        representativeQueries: [
          "list the countries visited on AhBeGrand",
          "show the published travel blogs",
          "what flights are recorded on the travel map",
        ],
      },
      {
        identifier: `urn:air:${host}:server:travel-mcp`,
        displayName: "AhBeGrand MCP server",
        type: "application/json",
        url: `${origin}/.well-known/mcp/server-card.json`,
        representativeQueries: [
          "search AhBeGrand blogs for a country",
          "read the AhBeGrand map page as markdown",
        ],
      },
      {
        identifier: `urn:air:${host}:skill:browse`,
        displayName: "Browse AhBeGrand",
        type: "text/markdown",
        url: `${origin}/.well-known/agent-skills/browse-ahbegrand/SKILL.md`,
        representativeQueries: [
          "how should an agent read the AhBeGrand website",
          "where is the AhBeGrand API documentation",
        ],
      },
    ],
  };
}

export function buildAuthMarkdown(origin: string): string {
  return `# auth.md

Instructions for agents that want to read AhBeGrand.

## Audience

Agents fetching public travel pages, markdown, and read-only JSON. There is no agent account and no self-service registration.

<a id="public-read"></a>
## Public read

No credential is required.

- Open the HTML site in a browser, or send \`Accept: text/markdown\` to a public page.
- Call the public GET API. The catalog is \`${origin}/.well-known/api-catalog\`, the OpenAPI document is \`${origin}/openapi.json\`, and the human docs are \`${origin}/docs/api\`.
- \`GET ${origin}/api/health\` returns \`{"status":"ok"}\`.

Do not send an Authorization header. Public responses succeed without a bearer token.

## Admin

\`/admin\` and every write API belong to the human operator. Sign-in is an Auth.js session cookie created at \`${origin}/login\`. Agents must not try to register, guess passwords, or complete an OAuth grant.

## Discovery documents

- Protected resource metadata: \`${origin}/.well-known/oauth-protected-resource\`
- Authorization server metadata: \`${origin}/.well-known/oauth-authorization-server\`

Those documents list the field names from RFC 8414 and RFC 9728. \`authorization_servers\` contains \`${origin}\`, which matches \`issuer\`. The authorize and token URLs respond with an error. They do not collect secrets and they do not return access tokens. The anonymous method in \`agent_auth\` means public read access with no credential. \`register_uri\` is this file.
`;
}
