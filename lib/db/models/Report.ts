import { getDb } from "../mongodb";

const COLLECTION_NAME = "reports";

export async function getReportsCollection() {
  const db = await getDb();
  return db.collection(COLLECTION_NAME);
}

export async function ensureReportIndexes() {
  const col = await getReportsCollection();
  await col.createIndex({ station_uni_id: 1, status: 1 });
  await col.createIndex({ ipHash: 1, station_uni_id: 1 });
  await col.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90일 TTL
}
