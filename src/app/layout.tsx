import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { Suspense } from "react";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { SiteHeader } from "@/components/SiteHeader";
import { WEB_MCP_BOOTSTRAP } from "@/lib/agent/webmcp-bootstrap";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AhBeGrand",
    template: "%s · AhBeGrand",
  },
  description:
    "A personal travel map of visited countries, routes, and bookmarks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <head>
        <link rel="describedby" href="/.well-known/ai-catalog.json" />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <script dangerouslySetInnerHTML={{ __html: WEB_MCP_BOOTSTRAP }} />
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
