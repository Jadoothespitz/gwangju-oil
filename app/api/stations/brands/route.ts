import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const brands: string[] = await db.collection("stations").distinct("brand");
    return NextResponse.json(
      { brands: brands.filter(Boolean) },
      { headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=172800" } }
    );
  } catch (error) {
    console.error("brands 조회 오류:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
