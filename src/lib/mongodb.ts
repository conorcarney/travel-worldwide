import { MongoClient } from "mongodb";

const uri = process.env.ATLAS_URI ?? process.env.MONGODB_URI;

declare global {
  // eslint-disable-next-line no-var -- Next.js hot reload singleton
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function isMongoConfigured(): boolean {
  return Boolean(uri);
}

export async function getMongoClient(): Promise<MongoClient | null> {
  if (!uri) {
    return null;
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }

  return global._mongoClientPromise;
}

export async function getDb() {
  const client = await getMongoClient();
  if (!client) {
    return null;
  }

  const dbName = process.env.MONGODB_DB ?? "Countries";
  return client.db(dbName);
}
