import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchApiList } from "@/lib/map/parse-api";

describe("fetchApiList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON when the response is ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          source: "fixtures",
          data: [{ name: "Ireland" }],
        }),
      }),
    );

    await expect(fetchApiList("/api/visited")).resolves.toEqual({
      ok: true,
      source: "fixtures",
      data: [{ name: "Ireland" }],
    });
    expect(fetch).toHaveBeenCalledWith("/api/visited");
  });

  it("returns an error payload when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false }),
      }),
    );

    await expect(fetchApiList("/api/flights")).resolves.toEqual({
      ok: false,
      error: "HTTP 500",
    });
  });
});
