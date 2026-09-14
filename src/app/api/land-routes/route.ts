import { jsonError, jsonOk, serializeDocs } from "@/lib/data";
import { LAND_ROUTES_COLLECTION } from "@/lib/land-routes-encode";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    if (db && isMongoConfigured()) {
      const docs = await db
        .collection(LAND_ROUTES_COLLECTION)
        .find({})
        .limit(5000)
        .toArray();
      return jsonOk({ data: serializeDocs(docs), source: "mongodb" });
    }
    return jsonOk({ data: [], source: "fixtures" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load land routes";
    return jsonError(message);
  }
}
