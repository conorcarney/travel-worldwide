import { type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/collections";
import { serializeDocs } from "@/lib/data";
import { parseObjectId, requireConfiguredDb, StoreError } from "@/lib/store";
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

export { StoreError as FlightStoreError };

function flightsCollection(db: Db) {
  return db.collection(COLLECTIONS.flights);
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

function flightId(id: string) {
  return parseObjectId(id, "Invalid flight id");
}

export async function listFlights(): Promise<FlightRecord[]> {
  const db = await requireConfiguredDb();
  const docs = await flightsCollection(db).find({}).limit(5000).toArray();
  return serializeDocs(docs) as FlightRecord[];
}

export async function createFlight(
  input: FlightWriteInput,
): Promise<FlightRecord> {
  const db = await requireConfiguredDb();
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
  const db = await requireConfiguredDb();
  const document = toFlightDocument(input);
  const result = await flightsCollection(db).findOneAndUpdate(
    { _id: flightId(id) },
    { $set: document },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new StoreError("Flight not found", 404);
  }

  const [serialized] = serializeDocs([result]) as FlightRecord[];
  return serialized!;
}

export async function deleteFlight(id: string): Promise<void> {
  const db = await requireConfiguredDb();
  const result = await flightsCollection(db).deleteOne({ _id: flightId(id) });
  if (result.deletedCount === 0) {
    throw new StoreError("Flight not found", 404);
  }
}
