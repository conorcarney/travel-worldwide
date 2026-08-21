import { ObjectId, type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/collections";
import { serializeDocs } from "@/lib/data";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import {
  flightWriteSchema,
  type FlightRecord,
  type FlightWriteInput,
} from "@/lib/validations/flight-write";

export {
  flightWriteSchema,
  type FlightRecord,
  type FlightWriteInput,
} from "@/lib/validations/flight-write";

export async function requireFlightsDb(): Promise<Db> {
  if (!isMongoConfigured()) {
    throw new FlightStoreError("MongoDB is not configured", 503);
  }
  const db = await getDb();
  if (!db) {
    throw new FlightStoreError("MongoDB is not available", 503);
  }
  return db;
}

export class FlightStoreError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "FlightStoreError";
    this.status = status;
  }
}

function flightsCollection(db: Db) {
  return db.collection(COLLECTIONS.flights);
}

function parseObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new FlightStoreError("Invalid flight id", 400);
  }
  return new ObjectId(id);
}

export function toFlightDocument(input: FlightWriteInput) {
  return {
    departure: input.departure,
    arrival: input.arrival,
    connecting: input.connecting ?? "",
    date: input.date,
    departure_coordinates: normalizeCoordinatePair(input.departure_coordinates),
    connecting_coordinates: input.connecting_coordinates
      ? normalizeCoordinatePair(input.connecting_coordinates)
      : "",
    arrival_coordinates: normalizeCoordinatePair(input.arrival_coordinates),
    tags: input.tags ?? "",
    media: input.media ?? "",
  };
}

function normalizeCoordinatePair(value: string): string {
  const [lng, lat] = value.split(",").map((part) => part.trim());
  return `${lng}, ${lat}`;
}

export async function listFlights(): Promise<FlightRecord[]> {
  const db = await requireFlightsDb();
  const docs = await flightsCollection(db).find({}).limit(5000).toArray();
  return serializeDocs(docs) as FlightRecord[];
}

export async function createFlight(
  input: FlightWriteInput,
): Promise<FlightRecord> {
  const db = await requireFlightsDb();
  const document = toFlightDocument(input);
  const result = await flightsCollection(db).insertOne(document);
  return {
    _id: String(result.insertedId),
    ...document,
  };
}

export async function updateFlight(
  id: string,
  input: FlightWriteInput,
): Promise<FlightRecord> {
  const db = await requireFlightsDb();
  const objectId = parseObjectId(id);
  const document = toFlightDocument(input);
  const result = await flightsCollection(db).findOneAndUpdate(
    { _id: objectId },
    { $set: document },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new FlightStoreError("Flight not found", 404);
  }

  const [serialized] = serializeDocs([result]) as FlightRecord[];
  return serialized!;
}

export async function deleteFlight(id: string): Promise<void> {
  const db = await requireFlightsDb();
  const objectId = parseObjectId(id);
  const result = await flightsCollection(db).deleteOne({ _id: objectId });
  if (result.deletedCount === 0) {
    throw new FlightStoreError("Flight not found", 404);
  }
}
