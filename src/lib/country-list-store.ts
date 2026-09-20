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
import { requireConfiguredDb, StoreError } from "@/lib/store";
import type { CountryListWriteInput } from "@/lib/validations/country-list-write";

export { countryListWriteSchema } from "@/lib/validations/country-list-write";

export { StoreError as CountryListStoreError };

type CountryListDocument = Document & {
  _id: ObjectId;
  type?: string;
  features?: unknown[];
};

function countryListCollection(db: Db) {
  return db.collection(COLLECTIONS.countryList);
}

async function loadCountryListDocument(db: Db): Promise<CountryListDocument> {
  const doc = await countryListCollection(db).findOne({
    type: "FeatureCollection",
    features: { $type: "array" },
  });
  if (!doc) {
    throw new StoreError("Country list not found", 404);
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
  const db = await requireConfiguredDb();
  const doc = await loadCountryListDocument(db);
  return listCountryNames(currentCountries(doc));
}

export async function addCountryToList(
  input: CountryListWriteInput,
): Promise<string[]> {
  const db = await requireConfiguredDb();
  const doc = await loadCountryListDocument(db);
  const countries = currentCountries(doc);

  if (countryAlreadyListed(countries, input.name)) {
    throw new StoreError("That country is already on the list", 409);
  }

  const feature = createNameOnlyCountryFeature(input.name);
  const nextFeatures = [...countries.features, feature];
  const result = await countryListCollection(db).updateOne(
    { _id: doc._id },
    { $set: { features: nextFeatures } },
  );
  if (result.matchedCount === 0) {
    throw new StoreError("Country list not found", 404);
  }

  return listCountryNames({
    type: "FeatureCollection",
    features: [...countries.features, feature],
  });
}

export async function removeCountryFromList(name: string): Promise<string[]> {
  const db = await requireConfiguredDb();
  const doc = await loadCountryListDocument(db);
  const countries = currentCountries(doc);
  const { countries: nextCountries, removed } = removeCountryFeaturesByName(
    countries,
    name,
  );

  if (removed === 0) {
    throw new StoreError("Country not found on the list", 404);
  }

  const result = await countryListCollection(db).updateOne(
    { _id: doc._id },
    { $set: { features: nextCountries.features } },
  );
  if (result.matchedCount === 0) {
    throw new StoreError("Country list not found", 404);
  }

  return listCountryNames(nextCountries);
}
