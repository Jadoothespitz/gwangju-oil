import { NextResponse } from "next/server";
import { getAvgSidoPrice } from "@/lib/opinet/client";
import { getDb } from "@/lib/db/mongodb";

export async function GET() {
  try {
    const [data, db] = await Promise.all([getAvgSidoPrice(), getDb()]);

    // B027=휘발유, D047=경유
    const get = (sidonm: string, prodcd: string) =>
      data.find((d) => d.SIDONM === sidonm && d.PRODCD === prodcd);

    const natGas = get("전국", "B027");
    const natDie = get("전국", "D047");
    const gjGas  = get("광주", "B027");
    const gjDie  = get("광주", "D047");

    // 어제 스냅샷에서 전일 가격 조회 → 직접 diff 계산
    const yesterday = new Date(Date.now() + 9 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10).replace(/-/g, "");
    const snapshot = await db.collection("avg_price_snapshot").findOne({ date: yesterday });

    const calcDiff = (todayPrice: number | undefined, prevPrice: unknown) => {
      if (todayPrice == null || typeof prevPrice !== "number") return null;
      return Math.round((todayPrice - prevPrice) * 10) / 10;
    };

    return NextResponse.json(
      {
        national: {
          gasoline: {
            price: natGas?.PRICE ?? null,
            diff: calcDiff(natGas?.PRICE, snapshot?.national_gasoline),
          },
          diesel: {
            price: natDie?.PRICE ?? null,
            diff: calcDiff(natDie?.PRICE, snapshot?.national_diesel),
          },
        },
        gwangju: {
          gasoline: {
            price: gjGas?.PRICE ?? null,
            diff: calcDiff(gjGas?.PRICE, snapshot?.gwangju_gasoline),
          },
          diesel: {
            price: gjDie?.PRICE ?? null,
            diff: calcDiff(gjDie?.PRICE, snapshot?.gwangju_diesel),
          },
        },
        date: natGas?.DATE ?? null,
      },
      {
        headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200" },
      }
    );
  } catch (error) {
    console.error("평균 유가 조회 오류:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
