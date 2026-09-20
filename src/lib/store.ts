import { ObjectId, type Db } from "mongodb";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

/** HTTP-aware error thrown by Mongo-backed stores. */
export class StoreError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "StoreError";
    this.status = status;
  }
}

export async function requireConfiguredDb(): Promise<Db> {
  if (!isMongoConfigured()) {
    throw new StoreError("MongoDB is not configured", 503);
  }
  const db = await getDb();
  if (!db) {
    throw new StoreError("MongoDB is not available", 503);
  }
  return db;
}

export function parseObjectId(id: string, invalidMessage: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new StoreError(invalidMessage, 400);
  }
  return new ObjectId(id);
}
