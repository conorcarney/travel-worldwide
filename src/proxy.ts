import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { HOMEPAGE_LINK_HEADER } from "@/lib/agent/link-header";

const SKIP_PREFIXES = ["/api", "/oauth", "/mcp", "/_next"];

function wantsMarkdown(accept: string): boolean {
  return accept.split(",").some((part) => {
    const [type, ...params] = part.trim().toLowerCase().split(";");
    if (type !== "text/markdown") return false;
    return !params.some((param) => param.trim().replace(/\s/g, "") === "q=0");
  });
}

function isDocument(pathname: string): boolean {
  if (pathname.includes(".")) return false;
  return !SKIP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  if (wantsMarkdown(request.headers.get("accept") ?? "") && isDocument(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/agent-markdown";
    url.search = "";
    url.searchParams.set("path", pathname);
    return NextResponse.rewrite(url);
  }

  const response = NextResponse.next();
  if (pathname === "/") {
    response.headers.append("Link", HOMEPAGE_LINK_HEADER);
  }
  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
