import { NextResponse } from "next/server";
import { COLLECTIONS, type CollectionKey } from "@/lib/collections";
import { fixtures } from "@/lib/fixtures";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

export type DataSource = "mongodb" | "fixtures";

export function serializeDocs(docs: unknown[]): unknown[] {
  return JSON.parse(JSON.stringify(docs)) as unknown[];
}

export async function loadCollection(key: CollectionKey): Promise<{
  data: unknown[];
  source: DataSource;
}> {
  const db = await getDb();

  if (db && isMongoConfigured()) {
    const docs = await db
      .collection(COLLECTIONS[key])
      .find({})
      .limit(5000)
      .toArray();
    return { data: serializeDocs(docs), source: "mongodb" };
  }

  return { data: fixtures[key], source: "fixtures" };
}

export function jsonOk(payload: {
  data: unknown[];
  source: DataSource;
}) {
  return NextResponse.json({ ok: true, ...payload });
}

export function jsonError(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
