import { describe, expect, it } from "vitest";
import {
  classifyTrafficSource,
  gaMeasurementId,
  isPublicAnalyticsPath,
  pagePath,
} from "@/lib/analytics";

describe("gaMeasurementId", () => {
  it("accepts a GA4 measurement id", () => {
    expect(gaMeasurementId("G-ABC123XYZ")).toBe("G-ABC123XYZ");
  });

  it("rejects empty or malformed ids", () => {
    expect(gaMeasurementId("")).toBeNull();
    expect(gaMeasurementId("UA-123")).toBeNull();
    expect(gaMeasurementId("G-<script>")).toBeNull();
  });
});

describe("isPublicAnalyticsPath", () => {
  it("skips admin, login, and api routes", () => {
    expect(isPublicAnalyticsPath("/map")).toBe(true);
    expect(isPublicAnalyticsPath("/blogs/ireland")).toBe(true);
    expect(isPublicAnalyticsPath("/admin/blogs")).toBe(false);
    expect(isPublicAnalyticsPath("/login")).toBe(false);
    expect(isPublicAnalyticsPath("/api/blogs")).toBe(false);
  });
});

describe("pagePath", () => {
  it("keeps the search string on the path", () => {
    expect(pagePath("/map", "?tag=Work")).toBe("/map?tag=Work");
    expect(pagePath("/map", "tag=Work")).toBe("/map?tag=Work");
    expect(pagePath("/blogs", "")).toBe("/blogs");
  });
});

describe("classifyTrafficSource", () => {
  it("reads google, instagram, tiktok, and facebook from utm_source", () => {
    expect(
      classifyTrafficSource({ referrer: "", search: "utm_source=instagram" })
        .source,
    ).toBe("instagram");
    expect(
      classifyTrafficSource({
        referrer: "",
        search: "utm_source=tiktok&utm_medium=social",
      }).source,
    ).toBe("tiktok");
    expect(
      classifyTrafficSource({ referrer: "", search: "utm_source=facebook" })
        .source,
    ).toBe("facebook");
    expect(
      classifyTrafficSource({ referrer: "", search: "utm_source=google" })
        .source,
    ).toBe("google");
  });

  it("uses click ids when utm is missing", () => {
    expect(
      classifyTrafficSource({ referrer: "", search: "fbclid=abc" }).source,
    ).toBe("facebook");
    expect(
      classifyTrafficSource({ referrer: "", search: "ttclid=1" }).source,
    ).toBe("tiktok");
    expect(
      classifyTrafficSource({ referrer: "", search: "gclid=1" }),
    ).toEqual({ source: "google", medium: "cpc", detail: "gclid" });
  });

  it("classifies search and social referrers", () => {
    expect(
      classifyTrafficSource({
        referrer: "https://www.google.ie/search?q=ahbegrand",
        search: "",
      }),
    ).toMatchObject({ source: "google", medium: "organic" });
    expect(
      classifyTrafficSource({
        referrer: "https://l.instagram.com/",
        search: "",
      }).source,
    ).toBe("instagram");
    expect(
      classifyTrafficSource({
        referrer: "https://www.tiktok.com/",
        search: "",
      }).source,
    ).toBe("tiktok");
    expect(
      classifyTrafficSource({
        referrer: "https://m.facebook.com/",
        search: "",
      }).source,
    ).toBe("facebook");
  });

  it("treats missing referrers as direct", () => {
    expect(classifyTrafficSource({ referrer: "", search: "" }).source).toBe(
      "direct",
    );
  });
});
