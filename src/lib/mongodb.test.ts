import { afterEach, describe, expect, it, vi } from "vitest";

describe("mongodb helpers", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete globalThis._mongoClientPromise;
  });

  it("isMongoConfigured is false when no Atlas URI is set", async () => {
    vi.stubEnv("ATLAS_URI", "");
    vi.stubEnv("MONGODB_URI", "");
    const { isMongoConfigured } = await import("@/lib/mongodb");
    expect(isMongoConfigured()).toBe(false);
  });

  it("isMongoConfigured is true when ATLAS_URI is set", async () => {
    vi.stubEnv("ATLAS_URI", "mongodb+srv://example");
    vi.stubEnv("MONGODB_URI", "");
    const { isMongoConfigured } = await import("@/lib/mongodb");
    expect(isMongoConfigured()).toBe(true);
  });

  it("getDb returns null when Mongo is not configured", async () => {
    vi.stubEnv("ATLAS_URI", "");
    vi.stubEnv("MONGODB_URI", "");
    const { getDb } = await import("@/lib/mongodb");
    await expect(getDb()).resolves.toBeNull();
  });

  it("getDb uses MONGODB_DB or defaults to Countries", async () => {
    const db = { name: "Countries" };
    const connect = vi.fn().mockResolvedValue({
      db: vi.fn().mockReturnValue(db),
    });

    class FakeMongoClient {
      connect = connect;
    }

    vi.doMock("mongodb", () => ({
      MongoClient: FakeMongoClient,
    }));
    vi.stubEnv("ATLAS_URI", "mongodb+srv://example");
    vi.stubEnv("MONGODB_DB", "Countries");

    const { getDb } = await import("@/lib/mongodb");
    await expect(getDb()).resolves.toBe(db);
  });
});
