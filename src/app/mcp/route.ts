import { loadPublicBlogs } from "@/lib/blog-pages";
import { renderAgentMarkdown } from "@/lib/agent/markdown-page";
import { buildMcpServerCard } from "@/lib/agent/discovery";
import { originFromRequest } from "@/lib/agent/site-origin";
import { briefBlogDescription } from "@/lib/validations/blog-write";

export const dynamic = "force-dynamic";

const TOOLS = [
  {
    name: "search_blogs",
    description: "Search published AhBeGrand travel blogs by keyword.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Words to match in titles and stories",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "list_public_pages",
    description: "List the public AhBeGrand pages an agent can open.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "read_page",
    description: "Read a public AhBeGrand page as markdown.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Site path such as /map or /blogs/some-slug",
        },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },
] as const;

type ToolName = (typeof TOOLS)[number]["name"];

function rpcResult(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: unknown, code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } });
}

async function callTool(
  name: string | undefined,
  args: Record<string, unknown>,
  origin: string,
): Promise<string> {
  if (name === "list_public_pages") {
    return JSON.stringify(["/", "/map", "/stats", "/blogs", "/contact", "/docs/api"]);
  }

  if (name === "search_blogs") {
    const query = String(args.query ?? "").trim().toLowerCase();
    const blogs = await loadPublicBlogs();
    const matches = blogs
      .filter((blog) => {
        const haystack = [blog.blog_title, blog.name, blog.blog_description, blog.tags]
          .join(" ")
          .toLowerCase();
        return query === "" || haystack.includes(query);
      })
      .slice(0, 20)
      .map((blog) => ({
        title: blog.blog_title,
        path: `/blogs/${blog.url}`,
        country: blog.name,
        summary: briefBlogDescription(blog.blog_description, 140),
      }));
    return JSON.stringify(matches);
  }

  if (name === "read_page") {
    const path = String(args.path ?? "/");
    const page = await renderAgentMarkdown(path.startsWith("/") ? path : `/${path}`, origin);
    return page.body;
  }

  throw new Error("Unknown tool");
}

function isToolName(name: string | undefined): name is ToolName {
  return TOOLS.some((tool) => tool.name === name);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  if (!body || typeof body !== "object") {
    return rpcError(null, -32600, "Invalid request");
  }

  const message = body as {
    id?: unknown;
    method?: unknown;
    params?: { name?: unknown; arguments?: unknown };
  };
  const id = message.id ?? null;
  const method = typeof message.method === "string" ? message.method : "";

  if (method === "notifications/initialized") {
    return new Response(null, { status: 202 });
  }

  if (method === "initialize") {
    return rpcResult(id, {
      protocolVersion: "2025-06-18",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "AhBeGrand", version: "1.0.1" },
    });
  }

  if (method === "ping") return rpcResult(id, {});

  if (method === "tools/list") return rpcResult(id, { tools: TOOLS });

  if (method === "tools/call") {
    const name = typeof message.params?.name === "string" ? message.params.name : undefined;
    const args =
      message.params?.arguments && typeof message.params.arguments === "object"
        ? (message.params.arguments as Record<string, unknown>)
        : {};
    if (!isToolName(name)) {
      return rpcError(id, -32602, "Unknown tool");
    }
    try {
      const text = await callTool(name, args, originFromRequest(request));
      return rpcResult(id, { content: [{ type: "text", text }] });
    } catch {
      return rpcResult(id, {
        content: [{ type: "text", text: "The tool could not be completed." }],
        isError: true,
      });
    }
  }

  return rpcError(id, -32601, "Method not found");
}

export function GET(request: Request) {
  return Response.json(buildMcpServerCard(originFromRequest(request)));
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    },
  });
}
