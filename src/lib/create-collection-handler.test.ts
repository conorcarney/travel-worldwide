import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadCollectionMock, jsonOkMock, jsonErrorMock } = vi.hoisted(() => ({
  loadCollectionMock: vi.fn(),
  jsonOkMock: vi.fn(),
  jsonErrorMock: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
  loadCollection: loadCollectionMock,
  jsonOk: jsonOkMock,
  jsonError: jsonErrorMock,
}));

import { createCollectionGetHandler } from "@/lib/create-collection-handler";

describe("createCollectionGetHandler", () => {
  beforeEach(() => {
    loadCollectionMock.mockReset();
    jsonOkMock.mockReset();
    jsonErrorMock.mockReset();
  });

  it("returns jsonOk with the loaded collection payload", async () => {
    const payload = { data: [{ name: "Ireland" }], source: "fixtures" as const };
    const response = new Response("ok");
    loadCollectionMock.mockResolvedValue(payload);
    jsonOkMock.mockReturnValue(response);

    const GET = createCollectionGetHandler("visited");
    await expect(GET()).resolves.toBe(response);
    expect(loadCollectionMock).toHaveBeenCalledWith("visited");
    expect(jsonOkMock).toHaveBeenCalledWith(payload);
  });

  it("returns jsonError when loading throws an Error", async () => {
    const response = new Response("err");
    loadCollectionMock.mockRejectedValue(new Error("db down"));
    jsonErrorMock.mockReturnValue(response);

    const GET = createCollectionGetHandler("flights");
    await expect(GET()).resolves.toBe(response);
    expect(jsonErrorMock).toHaveBeenCalledWith("db down");
  });

  it("returns a generic jsonError for non-Error throws", async () => {
    const response = new Response("err");
    loadCollectionMock.mockRejectedValue("nope");
    jsonErrorMock.mockReturnValue(response);

    const GET = createCollectionGetHandler("blogs");
    await expect(GET()).resolves.toBe(response);
    expect(jsonErrorMock).toHaveBeenCalledWith("Failed to load collection");
  });
});
