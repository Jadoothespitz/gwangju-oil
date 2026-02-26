import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { wgs84ToKatec } from "@/lib/geo/coordinateConverter";
import { isRateLimited, getClientIp } from "@/lib/api/rateLimit";

const GWANGJU_CENTERS = [
  { lat: 35.1397, lng: 126.7930 }, // 광산구 중심
  { lat: 35.1100, lng: 126.7930 }, // 광산구 남부
  { lat: 35.1800, lng: 126.7700 }, // 광산구 북서부 (평동·하남 산업단지)
  { lat: 35.1487, lng: 126.8560 }, // 서구
  { lat: 35.1740, lng: 126.9120 }, // 북구 중심
  { lat: 35.2100, lng: 126.8900 }, // 북구 북부 (용두·화암)
  { lat: 35.1460, lng: 126.9230 }, // 동구
  { lat: 35.1330, lng: 126.9020 }, // 남구 중심
  { lat: 35.1050, lng: 126.8800 }, // 남구 남부
];
const SEARCH_RADIUS = 8000;

export async function POST(request: NextRequest) {
  try {
    // 레이트 리밋 (5분에 1회)
    const ip = getClientIp(request);
    if (isRateLimited(`refresh:${ip}`, 1, 300_000)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    // 보안 키 확인 (CRON_SECRET 미설정 시에도 차단)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const apiKey = process.env.OPINET_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPINET_API_KEY is not set." },
        { status: 500 }
      );
    }

    // aroundAll.do로 가격 일괄 수집
    const gasolinePrices = new Map<string, number>();
    const dieselPrices = new Map<string, number>();

    for (const center of GWANGJU_CENTERS) {
      const katec = wgs84ToKatec(center.lng, center.lat);

      const gasRes = await fetch(
        `https://www.opinet.co.kr/api/aroundAll.do?code=${apiKey}&out=json&x=${Math.round(katec.x)}&y=${Math.round(katec.y)}&radius=${SEARCH_RADIUS}&prodcd=B027&sort=1`
      );
      const gasData = await gasRes.json();
      for (const s of gasData.RESULT?.OIL || []) {
        gasolinePrices.set(s.UNI_ID, s.PRICE);
      }

      const dslRes = await fetch(
        `https://www.opinet.co.kr/api/aroundAll.do?code=${apiKey}&out=json&x=${Math.round(katec.x)}&y=${Math.round(katec.y)}&radius=${SEARCH_RADIUS}&prodcd=D047&sort=1`
      );
      const dslData = await dslRes.json();
      for (const s of dslData.RESULT?.OIL || []) {
        dieselPrices.set(s.UNI_ID, s.PRICE);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // DB 업데이트
    const db = await getDb();
    const collection = db.collection("stations");

    const stations = await collection
      .find(
        { isActive: true, opinet_id: { $exists: true, $ne: null } },
        { projection: { opinet_id: 1 } }
      )
      .toArray();

    let updated = 0;
    const now = new Date().toISOString();

    for (const station of stations) {
      const gasPrice = gasolinePrices.get(station.opinet_id);
      const dslPrice = dieselPrices.get(station.opinet_id);

      if (gasPrice != null || dslPrice != null) {
        await collection.updateOne(
          { _id: station._id },
          {
            $set: {
              ...(gasPrice != null && { "prices.gasoline": gasPrice }),
              ...(dslPrice != null && { "prices.diesel": dslPrice }),
              "prices.updatedAt": now,
              lastSyncedAt: now,
            },
          }
        );
        updated++;
      }
    }

    return NextResponse.json({
      message: "Prices updated successfully.",
      updated,
      total: stations.length,
      gasolinePricesCollected: gasolinePrices.size,
      dieselPricesCollected: dieselPrices.size,
    });
  } catch (error) {
    console.error("Price refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
