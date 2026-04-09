import { NextRequest, NextResponse } from "next/server";
import { getAvgSidoPrice } from "@/lib/opinet/client";
import { getDb } from "@/lib/db/mongodb";

function kstToday() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString().slice(0, 10).replace(/-/g, "");
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const today = kstToday();

  const items = await getAvgSidoPrice();
  const get = (sidonm: string, prodcd: string) =>
    items.find((d) => d.SIDONM === sidonm && d.PRODCD === prodcd)?.PRICE ?? null;

  const prices = {
    national_gasoline: get("전국", "B027"),
    national_diesel:   get("전국", "D047"),
    gwangju_gasoline:  get("광주", "B027"),
    gwangju_diesel:    get("광주", "D047"),
  };

  const db = await getDb();
  const col = db.collection("avg_price_snapshot");

  await col.updateOne(
    { date: today },
    { $set: { date: today, ...prices } },
    { upsert: true }
  );

  const cutoff = new Date(Date.now() + 9 * 60 * 60 * 1000 - 365 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10).replace(/-/g, "");
  const { deletedCount } = await col.deleteMany({ date: { $lt: cutoff } });

  return NextResponse.json({
    message: "스냅샷 저장 완료",
    date: today,
    prices,
    ...(deletedCount > 0 && { deleted: deletedCount }),
  });
}
