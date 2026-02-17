import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";

export async function GET() {
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  const result: Record<string, unknown> = {
    hasKey: !!key,
    keyLength: key?.length ?? 0,
    keyPrefix: key ? key.substring(0, 4) + "..." : "(empty)",
    hasMongoDB: !!process.env.MONGODB_URI,
    mongoUriPrefix: process.env.MONGODB_URI?.substring(0, 20) + "...",
    hasOpinet: !!process.env.OPINET_API_KEY,
  };

  try {
    const db = await getDb();
    const count = await db.collection("stations").countDocuments();
    result.mongoOk = true;
    result.stationCount = count;
    result.dbName = db.databaseName;
  } catch (err: any) {
    result.mongoOk = false;
    result.mongoError = err.message;
  }

  return NextResponse.json(result);
}
