import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";

function kstDateDaysAgo(n: number): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000 - n * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10).replace(/-/g, "");
}

function kstToday(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString().slice(0, 10).replace(/-/g, "");
}

const PERIOD_DAYS: Record<string, number> = {
  "1w": 7,
  "1m": 30,
  "3m": 90,
  "1y": 365,
};

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") ?? "1m";
  const days = PERIOD_DAYS[period] ?? 30;

  const from = kstDateDaysAgo(days);
  const to = kstToday();

  const db = await getDb();
  const docs = await db
    .collection("avg_price_snapshot")
    .find({ date: { $gte: from, $lte: to } })
    .sort({ date: 1 })
    .project({ _id: 0, date: 1, national_gasoline: 1, national_diesel: 1, gwangju_gasoline: 1, gwangju_diesel: 1 })
    .toArray();

  const data = docs.map(d => ({
    date: d.date as string,
    national_gasoline: (d.national_gasoline as number) ?? null,
    national_diesel: (d.national_diesel as number) ?? null,
    gwangju_gasoline: (d.gwangju_gasoline as number) ?? null,
    gwangju_diesel: (d.gwangju_diesel as number) ?? null,
  }));

  return NextResponse.json(data, {
    headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200" },
  });
}
