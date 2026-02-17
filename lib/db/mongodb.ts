import { MongoClient, type Db } from "mongodb";

const globalWithMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI 환경 변수를 설정해주세요.");
  }

  if (process.env.NODE_ENV === "development") {
    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  }

  const client = new MongoClient(uri);
  return client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db("gwangju-gas");
}

export default getClientPromise;
