import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { StoreError } from "@/lib/store";

const { requireAdminApi } = vi.hoisted(() => ({
  requireAdminApi: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({
  requireAdminApi,
}));

import {
  createAdminCreateHandler,
  createAdminDeleteHandler,
  handleStoreAction,
  storeErrorResponse,
} from "@/lib/api/admin-handler";

describe("storeErrorResponse", () => {
  it("maps StoreError to its status", async () => {
    const response = storeErrorResponse(new StoreError("not found", 404), "fail");
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "not found",
    });
  });

  it("maps unknown errors to 500", async () => {
    const response = storeErrorResponse("nope", "Failed to save");
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Failed to save",
    });
  });
});

describe("handleStoreAction", () => {
  it("returns the action response", async () => {
    const response = await handleStoreAction("fail", async () =>
      Response.json({ ok: true }),
    );
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("catches StoreError from the action", async () => {
    const response = await handleStoreAction("fail", async () => {
      throw new StoreError("taken", 409);
    });
    expect(response.status).toBe(409);
  });
});

describe("createAdminCreateHandler", () => {
  const schema = z.object({ name: z.string().min(1, "Name is required") });

  beforeEach(() => {
    requireAdminApi.mockReset();
  });

  it("returns 401 when the caller is not an admin", async () => {
    requireAdminApi.mockResolvedValue({
      error: Response.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    });
    const POST = createAdminCreateHandler({
      schema,
      invalidMessage: "Invalid",
      fallbackError: "Failed",
      create: async () => ({ _id: "1" }),
    });
    const response = await POST(
      new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ name: "Spain" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("creates a record and returns 201", async () => {
    requireAdminApi.mockResolvedValue({ error: null });
    const create = vi.fn().mockResolvedValue({ _id: "1", name: "Spain" });
    const POST = createAdminCreateHandler({
      schema,
      invalidMessage: "Invalid",
      fallbackError: "Failed",
      create,
    });
    const response = await POST(
      new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ name: "Spain" }),
      }),
    );
    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith({ name: "Spain" });
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { _id: "1", name: "Spain" },
    });
  });

  it("returns 400 for invalid JSON bodies", async () => {
    requireAdminApi.mockResolvedValue({ error: null });
    const POST = createAdminCreateHandler({
      schema,
      invalidMessage: "Invalid",
      fallbackError: "Failed",
      create: async () => ({ _id: "1" }),
    });
    const response = await POST(
      new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Name is required",
    });
  });
});

describe("createAdminDeleteHandler", () => {
  it("deletes by route id", async () => {
    requireAdminApi.mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue(undefined);
    const DELETE = createAdminDeleteHandler({
      fallbackError: "Failed to delete",
      remove,
    });
    const response = await DELETE(new Request("http://localhost/api/1"), {
      params: Promise.resolve({ id: "abc" }),
    });
    expect(remove).toHaveBeenCalledWith("abc");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
