import { ObjectId, type Db, type Document } from "mongodb";
import { COLLECTIONS } from "@/lib/collections";
import {
  createNameOnlyCountryFeature,
  featureMatchesCountryName,
  listCountryNames,
  normalizeCountryList,
  removeCountryFeaturesByName,
  type CountryFeatureCollection,
} from "@/lib/map/countries";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import type { CountryListWriteInput } from "@/lib/validations/country-list-write";

export { countryListWriteSchema } from "@/lib/validations/country-list-write";

export class CountryListStoreError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CountryListStoreError";
    this.status = status;
  }
}

type CountryListDocument = Document & {
  _id: ObjectId;
  type?: string;
  features?: unknown[];
};

export async function requireCountryListDb(): Promise<Db> {
  if (!isMongoConfigured()) {
    throw new CountryListStoreError("MongoDB is not configured", 503);
  }
  const db = await getDb();
  if (!db) {
    throw new CountryListStoreError("MongoDB is not available", 503);
  }
  return db;
}

function countryListCollection(db: Db) {
  return db.collection(COLLECTIONS.countryList);
}

async function loadCountryListDocument(db: Db): Promise<CountryListDocument> {
  const doc = await countryListCollection(db).findOne({
    type: "FeatureCollection",
    features: { $type: "array" },
  });
  if (!doc) {
    throw new CountryListStoreError("Country list not found", 404);
  }
  return doc;
}

function currentCountries(doc: CountryListDocument): CountryFeatureCollection {
  return normalizeCountryList([doc]);
}

function countryAlreadyListed(
  countries: CountryFeatureCollection,
  name: string,
): boolean {
  return countries.features.some((feature) =>
    featureMatchesCountryName(feature.properties, name),
  );
}

export async function listStoredCountryNames(): Promise<string[]> {
  const db = await requireCountryListDb();
  const doc = await loadCountryListDocument(db);
  return listCountryNames(currentCountries(doc));
}

export async function addCountryToList(
  input: CountryListWriteInput,
): Promise<string[]> {
  const db = await requireCountryListDb();
  const doc = await loadCountryListDocument(db);
  const countries = currentCountries(doc);

  if (countryAlreadyListed(countries, input.name)) {
    throw new CountryListStoreError("That country is already on the list", 409);
  }

  const feature = createNameOnlyCountryFeature(input.name);
  const nextFeatures = [...countries.features, feature];
  const result = await countryListCollection(db).updateOne(
    { _id: doc._id },
    { $set: { features: nextFeatures } },
  );
  if (result.matchedCount === 0) {
    throw new CountryListStoreError("Country list not found", 404);
  }

  return listCountryNames({
    type: "FeatureCollection",
    features: [...countries.features, feature],
  });
}

export async function removeCountryFromList(name: string): Promise<string[]> {
  const db = await requireCountryListDb();
  const doc = await loadCountryListDocument(db);
  const countries = currentCountries(doc);
  const { countries: nextCountries, removed } = removeCountryFeaturesByName(
    countries,
    name,
  );

  if (removed === 0) {
    throw new CountryListStoreError("Country not found on the list", 404);
  }

  const result = await countryListCollection(db).updateOne(
    { _id: doc._id },
    { $set: { features: nextCountries.features } },
  );
  if (result.matchedCount === 0) {
    throw new CountryListStoreError("Country list not found", 404);
  }

  return listCountryNames(nextCountries);
}
