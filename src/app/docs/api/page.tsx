import type { Metadata } from "next";
import { PUBLIC_READ_ENDPOINTS } from "@/lib/agent/public-api";

export const metadata: Metadata = {
  title: "API",
  description: "Public read API for AhBeGrand travel data.",
};

export default function ApiDocsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl tracking-tight text-foreground">
        API documentation
      </h1>
      <p className="mt-3 text-muted">
        These GET endpoints return public travel data as JSON. No credential is
        required. Write requests and the admin area use a human session from
        the sign-in page.
      </p>
      <p className="mt-3 text-sm text-muted">
        Machine-readable description:{" "}
        <a className="underline" href="/openapi.json">
          /openapi.json
        </a>
      </p>
      <ul className="mt-8 space-y-3 text-sm">
        {PUBLIC_READ_ENDPOINTS.map((endpoint) => (
          <li key={endpoint.path}>
            <code className="text-foreground">GET {endpoint.path}</code>
            <span className="text-muted"> — {endpoint.summary}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
