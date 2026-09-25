/** Runs on page load. Registers WebMCP tools when the browser exposes modelContext. */
export const WEB_MCP_BOOTSTRAP = `(function () {
  function tools() {
    return [
      {
        name: "search_blogs",
        description: "Search published AhBeGrand travel blogs by keyword.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Words to match in titles and stories" }
          },
          required: ["query"],
          additionalProperties: false
        },
        execute: async function (input) {
          var query = String((input && input.query) || "").trim().toLowerCase();
          var response = await fetch("/api/blogs");
          var payload = await response.json();
          var blogs = Array.isArray(payload.data) ? payload.data : [];
          var matches = blogs.filter(function (blog) {
            var haystack = [blog.blog_title, blog.name, blog.blog_description, blog.tags].join(" ").toLowerCase();
            return query === "" || haystack.indexOf(query) !== -1;
          }).slice(0, 20).map(function (blog) {
            return { title: blog.blog_title, path: "/blogs/" + blog.url, country: blog.name };
          });
          return { content: [{ type: "text", text: JSON.stringify(matches) }] };
        }
      },
      {
        name: "list_public_pages",
        description: "List the public AhBeGrand pages an agent can open.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        execute: async function () {
          var pages = ["/", "/map", "/stats", "/blogs", "/contact", "/docs/api"];
          return { content: [{ type: "text", text: JSON.stringify(pages) }] };
        }
      },
      {
        name: "read_page",
        description: "Read a public AhBeGrand page as markdown.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Site path such as /map or /blogs/some-slug" }
          },
          required: ["path"],
          additionalProperties: false
        },
        execute: async function (input) {
          var path = String((input && input.path) || "/");
          if (path.charAt(0) !== "/") path = "/" + path;
          var response = await fetch(path, { headers: { Accept: "text/markdown" } });
          var text = await response.text();
          return { content: [{ type: "text", text: text }] };
        }
      }
    ];
  }

  function register() {
    var nav = typeof navigator === "undefined" ? null : navigator;
    var mc = nav && nav.modelContext;
    if (!mc) return;
    var defined = tools();
    try {
      if (typeof mc.provideContext === "function") mc.provideContext({ tools: defined });
    } catch (error) {}
    try {
      if (typeof mc.registerTool === "function") {
        var controller = new AbortController();
        window.addEventListener("pagehide", function () { controller.abort(); });
        for (var i = 0; i < defined.length; i++) mc.registerTool(defined[i], { signal: controller.signal });
      }
    } catch (error) {}
  }

  register();
})();
`;
