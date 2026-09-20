import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { parseObjectId, StoreError } from "@/lib/store";

describe("StoreError", () => {
  it("defaults to status 400", () => {
    const error = new StoreError("bad input");
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(400);
    expect(error.message).toBe("bad input");
  });

  it("keeps a custom status", () => {
    expect(new StoreError("missing", 404).status).toBe(404);
  });
});

describe("parseObjectId", () => {
  it("parses a valid id", () => {
    const id = "507f1f77bcf86cd799439011";
    expect(parseObjectId(id, "Invalid id").equals(new ObjectId(id))).toBe(true);
  });

  it("throws StoreError for an invalid id", () => {
    try {
      parseObjectId("not-an-id", "Invalid flight id");
      throw new Error("expected parseObjectId to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(StoreError);
      expect(error).toMatchObject({ message: "Invalid flight id", status: 400 });
    }
  });
});

describe("requireConfiguredDb", () => {
  it("throws 503 when Mongo is not configured", async () => {
    vi.resetModules();
    vi.doMock("@/lib/mongodb", () => ({
      isMongoConfigured: () => false,
      getDb: vi.fn(),
    }));
    const { requireConfiguredDb, StoreError: IsolatedStoreError } = await import(
      "@/lib/store"
    );
    await expect(requireConfiguredDb()).rejects.toMatchObject({
      message: "MongoDB is not configured",
      status: 503,
    });
    await expect(requireConfiguredDb()).rejects.toBeInstanceOf(IsolatedStoreError);
  });
});
