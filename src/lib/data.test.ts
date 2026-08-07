import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock, isMongoConfiguredMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  isMongoConfiguredMock: vi.fn(),
}));

vi.mock("@/lib/mongodb", () => ({
  getDb: getDbMock,
  isMongoConfigured: isMongoConfiguredMock,
}));

import { fixtures } from "@/lib/fixtures";
import { jsonError, jsonOk, loadCollection, serializeDocs } from "@/lib/data";

describe("serializeDocs", () => {
  it("round-trips plain JSON-safe values", () => {
    const input = [{ name: "Ireland", count: 1, nested: { ok: true } }];
    expect(serializeDocs(input)).toEqual(input);
  });

  it("converts Date values to ISO strings", () => {
    const date = new Date("2020-01-02T03:04:05.000Z");
    expect(serializeDocs([{ when: date }])).toEqual([
      { when: "2020-01-02T03:04:05.000Z" },
    ]);
  });
});

describe("jsonOk / jsonError", () => {
  it("jsonOk returns an ok payload", async () => {
    const response = jsonOk({ data: [{ name: "Spain" }], source: "fixtures" });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: [{ name: "Spain" }],
      source: "fixtures",
    });
  });

  it("jsonError returns the message and status", async () => {
    const response = jsonError("boom", 503);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "boom",
    });
  });

  it("jsonError defaults to status 500", async () => {
    const response = jsonError("failed");
    expect(response.status).toBe(500);
  });
});

describe("loadCollection", () => {
  beforeEach(() => {
    getDbMock.mockReset();
    isMongoConfiguredMock.mockReset();
  });

  it("returns fixtures when Mongo is not configured", async () => {
    getDbMock.mockResolvedValue(null);
    isMongoConfiguredMock.mockReturnValue(false);

    await expect(loadCollection("visited")).resolves.toEqual({
      data: fixtures.visited,
      source: "fixtures",
    });
  });

  it("returns serialized Mongo documents when configured", async () => {
    const docs = [{ _id: "abc", name: "Australia" }];
    const toArray = vi.fn().mockResolvedValue(docs);
    const limit = vi.fn().mockReturnValue({ toArray });
    const find = vi.fn().mockReturnValue({ limit });
    const collection = vi.fn().mockReturnValue({ find });

    getDbMock.mockResolvedValue({ collection });
    isMongoConfiguredMock.mockReturnValue(true);

    await expect(loadCollection("visited")).resolves.toEqual({
      data: docs,
      source: "mongodb",
    });
    expect(collection).toHaveBeenCalledWith("Visited");
    expect(find).toHaveBeenCalledWith({});
    expect(limit).toHaveBeenCalledWith(5000);
  });
});
