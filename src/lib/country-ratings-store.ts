import { type Db } from "mongodb";
import { COLLECTIONS } from "@/lib/collections";
import { serializeDocs } from "@/lib/data";
import { computeCountryRatingAverage } from "@/lib/map/country-ratings";
import { escapeRegex } from "@/lib/escape-regex";
import { parseObjectId, requireConfiguredDb, StoreError } from "@/lib/store";
import type {
  CountryRatingRecord,
  CountryRatingWriteInput,
} from "@/lib/validations/country-rating-write";

export {
  countryRatingWriteSchema,
  type CountryRatingRecord,
  type CountryRatingWriteInput,
} from "@/lib/validations/country-rating-write";

export { StoreError as CountryRatingStoreError };

function ratingsCollection(db: Db) {
  return db.collection(COLLECTIONS.countryRatings);
}

function ratingId(id: string) {
  return parseObjectId(id, "Invalid country rating id");
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
  const db = await requireConfiguredDb();
  const collection = ratingsCollection(db);

  const existing = await collection.findOne({
    name: { $regex: `^${escapeRegex(input.name)}$`, $options: "i" },
  });
  if (existing) {
    throw new StoreError("That country already has a rating", 409);
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
  const db = await requireConfiguredDb();
  const collection = ratingsCollection(db);
  const objectId = ratingId(id);

  const duplicate = await collection.findOne({
    _id: { $ne: objectId },
    name: { $regex: `^${escapeRegex(input.name)}$`, $options: "i" },
  });
  if (duplicate) {
    throw new StoreError("That country already has a rating", 409);
  }

  const document = toCountryRatingDocument(input);
  const result = await collection.findOneAndUpdate(
    { _id: objectId },
    { $set: document },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new StoreError("Country rating not found", 404);
  }

  const [serialized] = serializeDocs([result]) as CountryRatingRecord[];
  return serialized!;
}

export async function deleteCountryRating(id: string): Promise<void> {
  const db = await requireConfiguredDb();
  const result = await ratingsCollection(db).deleteOne({ _id: ratingId(id) });
  if (result.deletedCount === 0) {
    throw new StoreError("Country rating not found", 404);
  }
}
