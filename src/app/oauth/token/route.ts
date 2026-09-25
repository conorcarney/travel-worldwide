const OAUTH_ERROR = {
  error: "invalid_request",
  error_description:
    "AhBeGrand does not issue OAuth tokens. Read public travel data without a credential. Admin access is a human session at /login and is not available to agents.",
} as const;

export function GET() {
  return Response.json(OAUTH_ERROR, {
    status: 400,
    headers: { "Cache-Control": "no-store" },
  });
}

export const POST = GET;
