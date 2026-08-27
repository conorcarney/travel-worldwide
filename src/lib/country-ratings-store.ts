import { ObjectId, type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/collections";
import { serializeDocs } from "@/lib/data";
import { COUNTRY_RATING_SEED, computeCountryRatingAverage } from "@/lib/map/country-ratings";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import {
  type CountryRatingRecord,
  type CountryRatingWriteInput,
} from "@/lib/validations/country-rating-write";

export {
  countryRatingWriteSchema,
  type CountryRatingRecord,
  type CountryRatingWriteInput,
} from "@/lib/validations/country-rating-write";

export class CountryRatingStoreError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CountryRatingStoreError";
    this.status = status;
  }
}

export async function requireCountryRatingsDb(): Promise<Db> {
  if (!isMongoConfigured()) {
    throw new CountryRatingStoreError("MongoDB is not configured", 503);
  }
  const db = await getDb();
  if (!db) {
    throw new CountryRatingStoreError("MongoDB is not available", 503);
  }
  return db;
}

function ratingsCollection(db: Db) {
  return db.collection(COLLECTIONS.countryRatings);
}

function parseObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new CountryRatingStoreError("Invalid country rating id", 400);
  }
  return new ObjectId(id);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toCountryRatingDocument(input: CountryRatingWriteInput) {
  return {
    name: input.name,
    continent: input.continent,
    culture: input.culture,
    entertainment: input.entertainment,
    landscapes: input.landscapes,
    price: input.price,
    easeOfEntry: input.easeOfEntry,
    food: input.food,
    experiences: input.experiences,
    drivers: input.drivers,
    roads: input.roads,
    rating: computeCountryRatingAverage(input),
    returnVisit: input.returnVisit,
    reason: input.reason,
  };
}

export async function createCountryRating(
  input: CountryRatingWriteInput,
): Promise<CountryRatingRecord> {
  const db = await requireCountryRatingsDb();
  const collection = ratingsCollection(db);

  const existing = await collection.findOne({
    name: { $regex: `^${escapeRegex(input.name)}$`, $options: "i" },
  });
  if (existing) {
    throw new CountryRatingStoreError(
      "That country already has a rating",
      409,
    );
  }

  const document = toCountryRatingDocument(input);
  const result = await collection.insertOne(document);
  return {
    _id: String(result.insertedId),
    ...document,
  };
}

export async function updateCountryRating(
  id: string,
  input: CountryRatingWriteInput,
): Promise<CountryRatingRecord> {
  const db = await requireCountryRatingsDb();
  const collection = ratingsCollection(db);
  const objectId = parseObjectId(id);

  const duplicate = await collection.findOne({
    _id: { $ne: objectId },
    name: { $regex: `^${escapeRegex(input.name)}$`, $options: "i" },
  });
  if (duplicate) {
    throw new CountryRatingStoreError(
      "That country already has a rating",
      409,
    );
  }

  const document = toCountryRatingDocument(input);
  const result = await collection.findOneAndUpdate(
    { _id: objectId },
    { $set: document },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new CountryRatingStoreError("Country rating not found", 404);
  }

  const [serialized] = serializeDocs([result]) as CountryRatingRecord[];
  return serialized!;
}

export async function deleteCountryRating(id: string): Promise<void> {
  const db = await requireCountryRatingsDb();
  const objectId = parseObjectId(id);
  const result = await ratingsCollection(db).deleteOne({ _id: objectId });
  if (result.deletedCount === 0) {
    throw new CountryRatingStoreError("Country rating not found", 404);
  }
}

/** Insert spreadsheet seed rows when the collection is empty. */
export async function seedCountryRatings(force = false): Promise<{
  inserted: number;
  skipped: boolean;
}> {
  const db = await requireCountryRatingsDb();
  const collection = ratingsCollection(db);
  const existingCount = await collection.countDocuments();

  if (existingCount > 0 && !force) {
    return { inserted: 0, skipped: true };
  }

  if (force && existingCount > 0) {
    await collection.deleteMany({});
  }

  const documents = COUNTRY_RATING_SEED.map((row) =>
    toCountryRatingDocument(row),
  );
  if (documents.length === 0) {
    return { inserted: 0, skipped: false };
  }

  const result = await collection.insertMany(documents);
  return { inserted: result.insertedCount, skipped: false };
}
