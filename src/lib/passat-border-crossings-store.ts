import { type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/collections";
import { serializeDocs } from "@/lib/data";
import { parseObjectId, requireConfiguredDb, StoreError } from "@/lib/store";
import {
  type PassatBorderCrossingRecord,
  type PassatBorderCrossingWriteInput,
} from "@/lib/validations/passat-border-crossing-write";

export {
  passatBorderCrossingWriteSchema,
  type PassatBorderCrossingRecord,
  type PassatBorderCrossingWriteInput,
} from "@/lib/validations/passat-border-crossing-write";

export { StoreError as PassatBorderCrossingStoreError };

function crossingsCollection(db: Db) {
  return db.collection(COLLECTIONS.passatBorderCrossings);
}

function crossingId(id: string) {
  return parseObjectId(id, "Invalid border crossing id");
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
  const db = await requireConfiguredDb();
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
  const db = await requireConfiguredDb();
  const objectId = crossingId(id);
  const existing = await crossingsCollection(db).findOne({ _id: objectId });
  if (!existing) {
    throw new StoreError("Border crossing not found", 404);
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
    throw new StoreError("Border crossing not found", 404);
  }

  const [serialized] = serializeDocs([result]) as PassatBorderCrossingRecord[];
  return serialized!;
}

export async function deletePassatBorderCrossing(id: string): Promise<void> {
  const db = await requireConfiguredDb();
  const result = await crossingsCollection(db).deleteOne({
    _id: crossingId(id),
  });
  if (result.deletedCount === 0) {
    throw new StoreError("Border crossing not found", 404);
  }
}
