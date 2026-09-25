/** RFC 8288 link header for the homepage. */
export const HOMEPAGE_LINK_HEADER = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</openapi.json>; rel="service-desc"',
  '</docs/api>; rel="service-doc"',
  '</.well-known/ai-catalog.json>; rel="describedby"',
].join(", ");
