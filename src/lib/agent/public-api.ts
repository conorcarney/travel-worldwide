export const PUBLIC_READ_ENDPOINTS = [
  {
    path: "/api/health",
    summary: "Liveness check for the public site.",
  },
  {
    path: "/api/blogs",
    summary: "Published travel blogs.",
  },
  {
    path: "/api/blogs/{slug}",
    summary: "One published blog by URL slug.",
  },
  {
    path: "/api/countries",
    summary: "Country records used by the map.",
  },
  {
    path: "/api/country-list",
    summary: "Country names and codes for the checklist.",
  },
  {
    path: "/api/visited",
    summary: "Visited-country records.",
  },
  {
    path: "/api/flights",
    summary: "Flight records.",
  },
  {
    path: "/api/buses-trains-ferries",
    summary: "Bus, train, and ferry records.",
  },
  {
    path: "/api/land-routes",
    summary: "Encoded land routes.",
  },
  {
    path: "/api/maps-me-bookmarks",
    summary: "Maps.me bookmarks.",
  },
  {
    path: "/api/country-ratings",
    summary: "Country ratings.",
  },
  {
    path: "/api/passat-border-crossings",
    summary: "Passat road-trip border crossings.",
  },
] as const;

export function buildOpenApiDocument(origin: string) {
  const paths: Record<string, unknown> = {};
  for (const endpoint of PUBLIC_READ_ENDPOINTS) {
    paths[endpoint.path] = {
      get: {
        summary: endpoint.summary,
        responses: {
          "200": {
            description: "JSON payload with ok, source, and data.",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
        },
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "AhBeGrand public read API",
      version: "1.0.1",
      description:
        "Read-only travel data. Write operations and /admin require a human session cookie from /login. This API does not issue OAuth access tokens.",
    },
    servers: [{ url: origin }],
    paths,
  };
}
