import { type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/collections";
import { serializeDocs } from "@/lib/data";
import {
  deleteEncodedLandRoute,
  upsertEncodedLandRoute,
  type EncodedRouteSource,
} from "@/lib/land-routes-store";
import { parseObjectId, requireConfiguredDb, StoreError } from "@/lib/store";
import {
  type SurfaceRouteRecord,
  type SurfaceRouteWriteInput,
} from "@/lib/validations/surface-route-write";

export {
  SURFACE_ROUTE_TYPES,
  surfaceRouteWriteSchema,
  type SurfaceRouteRecord,
  type SurfaceRouteWriteInput,
} from "@/lib/validations/surface-route-write";

export type { EncodedRouteSource };

export type SurfaceRouteSaveResult = {
  route: SurfaceRouteRecord;
  encodedSource: EncodedRouteSource;
};

export { StoreError as SurfaceRouteStoreError };

function surfaceRoutesCollection(db: Db) {
  return db.collection(COLLECTIONS.busesTrainsAndFerries);
}

function routeId(id: string) {
  return parseObjectId(id, "Invalid route id");
}

export function toSurfaceRouteDocument(input: SurfaceRouteWriteInput) {
  return {
    departure: input.departure,
    arrival: input.arrival,
    departure_longitude: input.departure_longitude,
    departure_latitude: input.departure_latitude,
    arrival_longitude: input.arrival_longitude,
    arrival_latitude: input.arrival_latitude,
    type: input.type,
    date: input.date,
    tags: input.tags ?? "",
    media: input.media ?? "",
  };
}

async function encodeRoute(
  id: string,
  input: SurfaceRouteWriteInput,
): Promise<EncodedRouteSource> {
  return upsertEncodedLandRoute(id, input).catch((error: unknown) => {
    console.error("Failed to encode land route", error);
    return "existing" as const;
  });
}

export async function createSurfaceRoute(
  input: SurfaceRouteWriteInput,
): Promise<SurfaceRouteSaveResult> {
  const db = await requireConfiguredDb();
  const document = toSurfaceRouteDocument(input);
  const result = await surfaceRoutesCollection(db).insertOne(document);
  const route: SurfaceRouteRecord = {
    _id: String(result.insertedId),
    ...document,
  };
  return { route, encodedSource: await encodeRoute(route._id, input) };
}

export async function updateSurfaceRoute(
  id: string,
  input: SurfaceRouteWriteInput,
): Promise<SurfaceRouteSaveResult> {
  const db = await requireConfiguredDb();
  const document = toSurfaceRouteDocument(input);
  const result = await surfaceRoutesCollection(db).findOneAndUpdate(
    { _id: routeId(id) },
    { $set: document },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new StoreError("Route not found", 404);
  }

  const [serialized] = serializeDocs([result]) as SurfaceRouteRecord[];
  const route = serialized!;
  return { route, encodedSource: await encodeRoute(id, input) };
}

export async function deleteSurfaceRoute(id: string): Promise<void> {
  const db = await requireConfiguredDb();
  const result = await surfaceRoutesCollection(db).deleteOne({
    _id: routeId(id),
  });
  if (result.deletedCount === 0) {
    throw new StoreError("Route not found", 404);
  }
  await deleteEncodedLandRoute(id).catch((error: unknown) => {
    console.error("Failed to delete encoded land route", error);
  });
}
