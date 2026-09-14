import { ObjectId } from "mongodb";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import {
  encodeExistingLine,
  encodeSurfaceRoute,
  LAND_ROUTES_COLLECTION,
  type EncodedLandRouteResult,
  type EncodedRouteSource,
} from "@/lib/land-routes-encode";
import { createDefaultLandRouteRouters } from "@/lib/land-routes-providers";
import type { SurfaceRouteWriteInput } from "@/lib/validations/surface-route-write";

export { LAND_ROUTES_COLLECTION, type EncodedRouteSource };

function landRoutesCollection() {
  return getDb().then((db) => {
    if (!db || !isMongoConfigured()) return null;
    return db.collection(LAND_ROUTES_COLLECTION);
  });
}

export function toLandRouteMongoDoc(
  id: string,
  encoded: EncodedLandRouteResult,
) {
  const { source: _source, ...fields } = encoded;
  return {
    _id: new ObjectId(id),
    ...fields,
  };
}

export async function upsertEncodedLandRoute(
  id: string,
  input: SurfaceRouteWriteInput,
): Promise<EncodedRouteSource> {
  const collection = await landRoutesCollection();
  if (!collection) return "existing";

  let encoded: EncodedLandRouteResult;
  try {
    encoded = await encodeSurfaceRoute(input, createDefaultLandRouteRouters());
  } catch {
    encoded = encodeExistingLine(input);
  }

  await collection.replaceOne(
    { _id: new ObjectId(id) },
    toLandRouteMongoDoc(id, encoded),
    { upsert: true },
  );
  return encoded.source;
}

export async function deleteEncodedLandRoute(id: string): Promise<void> {
  const collection = await landRoutesCollection();
  if (!collection || !ObjectId.isValid(id)) return;
  await collection.deleteOne({ _id: new ObjectId(id) });
}
