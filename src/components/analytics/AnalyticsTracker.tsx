"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  classifyTrafficSource,
  isPublicAnalyticsPath,
  pagePath,
  trackPageEngagement,
  trackPageView,
  trackTrafficSource,
} from "@/lib/analytics";

const TRAFFIC_SESSION_KEY = "ga-traffic-source-sent";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const path = pagePath(pathname, search ? `?${search}` : "");
  const startedAt = useRef(performance.now());
  const pathRef = useRef(path);
  const sentEngagement = useRef(false);
  const isFirstPageView = useRef(true);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    if (!isPublicAnalyticsPath(pathname)) return;
    if (sessionStorage.getItem(TRAFFIC_SESSION_KEY)) return;

    const traffic = classifyTrafficSource({
      referrer: document.referrer,
      search: window.location.search,
    });
    trackTrafficSource(traffic);
    sessionStorage.setItem(TRAFFIC_SESSION_KEY, traffic.source);
  }, [pathname]);

  useEffect(() => {
    if (!isPublicAnalyticsPath(pathname)) return;

    startedAt.current = performance.now();
    sentEngagement.current = false;
    if (isFirstPageView.current) {
      isFirstPageView.current = false;
    } else {
      trackPageView(path, document.title);
    }

    function sendEngagement(reason: "navigate" | "pagehide") {
      if (sentEngagement.current) return;
      const elapsed = performance.now() - startedAt.current;
      if (reason === "navigate" && elapsed < 400) return;
      sentEngagement.current = true;
      trackPageEngagement({
        path: pathRef.current,
        timeOnPageMs: elapsed,
        reason,
      });
    }

    function onPageHide() {
      sendEngagement("pagehide");
    }

    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      sendEngagement("navigate");
    };
  }, [path, pathname]);

  return null;
}
