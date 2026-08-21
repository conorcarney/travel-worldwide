import { ObjectId, type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/collections";
import { serializeDocs } from "@/lib/data";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
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

export class SurfaceRouteStoreError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SurfaceRouteStoreError";
    this.status = status;
  }
}

export async function requireSurfaceRoutesDb(): Promise<Db> {
  if (!isMongoConfigured()) {
    throw new SurfaceRouteStoreError("MongoDB is not configured", 503);
  }
  const db = await getDb();
  if (!db) {
    throw new SurfaceRouteStoreError("MongoDB is not available", 503);
  }
  return db;
}

function surfaceRoutesCollection(db: Db) {
  return db.collection(COLLECTIONS.busesTrainsAndFerries);
}

function parseObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new SurfaceRouteStoreError("Invalid route id", 400);
  }
  return new ObjectId(id);
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

export async function createSurfaceRoute(
  input: SurfaceRouteWriteInput,
): Promise<SurfaceRouteRecord> {
  const db = await requireSurfaceRoutesDb();
  const document = toSurfaceRouteDocument(input);
  const result = await surfaceRoutesCollection(db).insertOne(document);
  return {
    _id: String(result.insertedId),
    ...document,
  };
}

export async function updateSurfaceRoute(
  id: string,
  input: SurfaceRouteWriteInput,
): Promise<SurfaceRouteRecord> {
  const db = await requireSurfaceRoutesDb();
  const objectId = parseObjectId(id);
  const document = toSurfaceRouteDocument(input);
  const result = await surfaceRoutesCollection(db).findOneAndUpdate(
    { _id: objectId },
    { $set: document },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new SurfaceRouteStoreError("Route not found", 404);
  }

  const [serialized] = serializeDocs([result]) as SurfaceRouteRecord[];
  return serialized!;
}

export async function deleteSurfaceRoute(id: string): Promise<void> {
  const db = await requireSurfaceRoutesDb();
  const objectId = parseObjectId(id);
  const result = await surfaceRoutesCollection(db).deleteOne({ _id: objectId });
  if (result.deletedCount === 0) {
    throw new SurfaceRouteStoreError("Route not found", 404);
  }
}
