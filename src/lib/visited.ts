import { type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/collections";
import { serializeDocs } from "@/lib/data";
import { escapeRegex } from "@/lib/escape-regex";
import { parseObjectId, requireConfiguredDb, StoreError } from "@/lib/store";
import {
  type VisitedRecord,
  type VisitedWriteInput,
} from "@/lib/validations/visited-write";

export {
  visitedWriteSchema,
  type VisitedRecord,
  type VisitedWriteInput,
} from "@/lib/validations/visited-write";

export { StoreError as VisitedStoreError };

function visitedCollection(db: Db) {
  return db.collection(COLLECTIONS.visited);
}

function visitedId(id: string) {
  return parseObjectId(id, "Invalid visited id");
}

export function toVisitedDocument(input: VisitedWriteInput) {
  const document: {
    name: string;
    date?: string;
    other_visit_dates?: string;
  } = {
    name: input.name,
  };
  if (input.date) {
    document.date = input.date;
  }
  if (input.other_visit_dates) {
    document.other_visit_dates = input.other_visit_dates;
  }
  return document;
}

export async function createVisited(
  input: VisitedWriteInput,
): Promise<VisitedRecord> {
  const db = await requireConfiguredDb();
  const collection = visitedCollection(db);

  const existing = await collection.findOne({
    name: { $regex: `^${escapeRegex(input.name)}$`, $options: "i" },
  });
  if (existing) {
    throw new StoreError("That country is already marked visited", 409);
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
  const db = await requireConfiguredDb();
  const collection = visitedCollection(db);
  const objectId = visitedId(id);

  const duplicate = await collection.findOne({
    _id: { $ne: objectId },
    name: { $regex: `^${escapeRegex(input.name)}$`, $options: "i" },
  });
  if (duplicate) {
    throw new StoreError("That country is already marked visited", 409);
  }

  const document = toVisitedDocument(input);
  const unset: Record<string, ""> = {};
  if (!document.date) unset.date = "";
  if (!document.other_visit_dates) unset.other_visit_dates = "";

  const result = await collection.findOneAndUpdate(
    { _id: objectId },
    Object.keys(unset).length > 0
      ? { $set: document, $unset: unset }
      : { $set: document },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new StoreError("Visited country not found", 404);
  }

  const [serialized] = serializeDocs([result]) as VisitedRecord[];
  return serialized!;
}

export async function deleteVisited(id: string): Promise<void> {
  const db = await requireConfiguredDb();
  const result = await visitedCollection(db).deleteOne({ _id: visitedId(id) });
  if (result.deletedCount === 0) {
    throw new StoreError("Visited country not found", 404);
  }
}
