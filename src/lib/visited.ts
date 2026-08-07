import { ObjectId, type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/collections";
import { serializeDocs } from "@/lib/data";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import {
  type VisitedRecord,
  type VisitedWriteInput,
} from "@/lib/validations/visited-write";

export {
  visitedWriteSchema,
  type VisitedRecord,
  type VisitedWriteInput,
} from "@/lib/validations/visited-write";

export class VisitedStoreError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "VisitedStoreError";
    this.status = status;
  }
}

export async function requireVisitedDb(): Promise<Db> {
  if (!isMongoConfigured()) {
    throw new VisitedStoreError("MongoDB is not configured", 503);
  }
  const db = await getDb();
  if (!db) {
    throw new VisitedStoreError("MongoDB is not available", 503);
  }
  return db;
}

function visitedCollection(db: Db) {
  return db.collection(COLLECTIONS.visited);
}

function parseObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new VisitedStoreError("Invalid visited id", 400);
  }
  return new ObjectId(id);
}

export function toVisitedDocument(input: VisitedWriteInput) {
  const document: { name: string; date?: string } = {
    name: input.name,
  };
  if (input.date) {
    document.date = input.date;
  }
  return document;
}

export async function createVisited(
  input: VisitedWriteInput,
): Promise<VisitedRecord> {
  const db = await requireVisitedDb();
  const collection = visitedCollection(db);

  const existing = await collection.findOne({
    name: { $regex: `^${escapeRegex(input.name)}$`, $options: "i" },
  });
  if (existing) {
    throw new VisitedStoreError("That country is already marked visited", 409);
  }

  const document = toVisitedDocument(input);
  const result = await collection.insertOne(document);
  return {
    _id: String(result.insertedId),
    ...document,
  };
}

export async function updateVisited(
  id: string,
  input: VisitedWriteInput,
): Promise<VisitedRecord> {
  const db = await requireVisitedDb();
  const collection = visitedCollection(db);
  const objectId = parseObjectId(id);

  const duplicate = await collection.findOne({
    _id: { $ne: objectId },
    name: { $regex: `^${escapeRegex(input.name)}$`, $options: "i" },
  });
  if (duplicate) {
    throw new VisitedStoreError("That country is already marked visited", 409);
  }

  const document = toVisitedDocument(input);
  const unsetDate = !input.date;

  const result = await collection.findOneAndUpdate(
    { _id: objectId },
    unsetDate
      ? { $set: { name: document.name }, $unset: { date: "" } }
      : { $set: document },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new VisitedStoreError("Visited country not found", 404);
  }

  const [serialized] = serializeDocs([result]) as VisitedRecord[];
  return serialized!;
}

export async function deleteVisited(id: string): Promise<void> {
  const db = await requireVisitedDb();
  const objectId = parseObjectId(id);
  const result = await visitedCollection(db).deleteOne({ _id: objectId });
  if (result.deletedCount === 0) {
    throw new VisitedStoreError("Visited country not found", 404);
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
