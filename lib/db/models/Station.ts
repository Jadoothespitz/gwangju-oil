import type { Db } from "mongodb";
import { getDb } from "../mongodb";

const COLLECTION_NAME = "stations";

export async function getStationsCollection() {
  const db = await getDb();
  return db.collection(COLLECTION_NAME);
}

export async function createIndexes() {
  const collection = await getStationsCollection();

  await collection.createIndex({ location: "2dsphere" });
  await collection.createIndex({ uni_id: 1 }, { unique: true });
  await collection.createIndex({ district: 1, "prices.gasoline": 1 });
  await collection.createIndex({ district: 1, "prices.diesel": 1 });
  await collection.createIndex({ dong: 1 });
  await collection.createIndex({ "sangsaeng.matched": 1 });

  console.log("인덱스 생성 완료");
}

export async function ensureCollection(db: Db) {
  const collections = await db
    .listCollections({ name: COLLECTION_NAME })
    .toArray();

  if (collections.length === 0) {
    await db.createCollection(COLLECTION_NAME);
    console.log(`${COLLECTION_NAME} 컬렉션 생성됨`);
  }
}
