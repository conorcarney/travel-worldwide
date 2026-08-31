import { ObjectId, type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/collections";
import { serializeDocs } from "@/lib/data";
import { PASSAT_BORDER_CROSSING_SEED } from "@/lib/map/passat-border-crossings";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import {
  type PassatBorderCrossingRecord,
  type PassatBorderCrossingWriteInput,
} from "@/lib/validations/passat-border-crossing-write";

export {
  passatBorderCrossingWriteSchema,
  type PassatBorderCrossingRecord,
  type PassatBorderCrossingWriteInput,
} from "@/lib/validations/passat-border-crossing-write";

export class PassatBorderCrossingStoreError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PassatBorderCrossingStoreError";
    this.status = status;
  }
}

export async function requirePassatBorderCrossingsDb(): Promise<Db> {
  if (!isMongoConfigured()) {
    throw new PassatBorderCrossingStoreError("MongoDB is not configured", 503);
  }
  const db = await getDb();
  if (!db) {
    throw new PassatBorderCrossingStoreError("MongoDB is not available", 503);
  }
  return db;
}

function crossingsCollection(db: Db) {
  return db.collection(COLLECTIONS.passatBorderCrossings);
}

function parseObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new PassatBorderCrossingStoreError("Invalid border crossing id", 400);
  }
  return new ObjectId(id);
}

export function toPassatBorderCrossingDocument(
  input: PassatBorderCrossingWriteInput,
  sortIndex: number,
) {
  return {
    departureCountry: input.departureCountry,
    entryCountry: input.entryCountry,
    borderName: input.borderName ?? "",
    date: input.date ?? "",
    entryTime: input.entryTime ?? "",
    totalCrossingTime: input.totalCrossingTime,
    sortIndex,
  };
}

async function nextSortIndex(db: Db): Promise<number> {
  const last = await crossingsCollection(db)
    .find({}, { projection: { sortIndex: 1 } })
    .sort({ sortIndex: -1 })
    .limit(1)
    .toArray();
  const current = last[0]?.sortIndex;
  return typeof current === "number" && Number.isFinite(current)
    ? current + 1
    : 0;
}

export async function createPassatBorderCrossing(
  input: PassatBorderCrossingWriteInput,
): Promise<PassatBorderCrossingRecord> {
  const db = await requirePassatBorderCrossingsDb();
  const document = toPassatBorderCrossingDocument(
    input,
    await nextSortIndex(db),
  );
  const result = await crossingsCollection(db).insertOne(document);
  return {
    _id: String(result.insertedId),
    ...document,
  };
}

export async function updatePassatBorderCrossing(
  id: string,
  input: PassatBorderCrossingWriteInput,
): Promise<PassatBorderCrossingRecord> {
  const db = await requirePassatBorderCrossingsDb();
  const objectId = parseObjectId(id);
  const existing = await crossingsCollection(db).findOne({ _id: objectId });
  if (!existing) {
    throw new PassatBorderCrossingStoreError("Border crossing not found", 404);
  }

  const sortIndex =
    typeof existing.sortIndex === "number" && Number.isFinite(existing.sortIndex)
      ? existing.sortIndex
      : 0;
  const document = toPassatBorderCrossingDocument(input, sortIndex);
  const result = await crossingsCollection(db).findOneAndUpdate(
    { _id: objectId },
    { $set: document },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new PassatBorderCrossingStoreError("Border crossing not found", 404);
  }

  const [serialized] = serializeDocs([result]) as PassatBorderCrossingRecord[];
  return serialized!;
}

export async function deletePassatBorderCrossing(id: string): Promise<void> {
  const db = await requirePassatBorderCrossingsDb();
  const objectId = parseObjectId(id);
  const result = await crossingsCollection(db).deleteOne({ _id: objectId });
  if (result.deletedCount === 0) {
    throw new PassatBorderCrossingStoreError("Border crossing not found", 404);
  }
}

/** Insert seed rows when the collection is empty. */
export async function seedPassatBorderCrossings(force = false): Promise<{
  inserted: number;
  skipped: boolean;
}> {
  const db = await requirePassatBorderCrossingsDb();
  const collection = crossingsCollection(db);
  const existingCount = await collection.countDocuments();

  if (existingCount > 0 && !force) {
    return { inserted: 0, skipped: true };
  }

  if (force && existingCount > 0) {
    await collection.deleteMany({});
  }

  const documents = PASSAT_BORDER_CROSSING_SEED.map((row) =>
    toPassatBorderCrossingDocument(row, row.sortIndex),
  );
  if (documents.length === 0) {
    return { inserted: 0, skipped: false };
  }

  const result = await collection.insertMany(documents);
  return { inserted: result.insertedCount, skipped: false };
}

/** Seed an empty Mongo collection so the stats page has the initial rows. */
export async function ensurePassatBorderCrossingsSeeded(): Promise<void> {
  if (!isMongoConfigured()) return;
  try {
    await seedPassatBorderCrossings();
  } catch {
    // Stats/admin can still load fixtures or an existing collection.
  }
}
