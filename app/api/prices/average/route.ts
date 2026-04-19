import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const [latest, prev] = await db
      .collection("avg_price_snapshot")
      .find({})
      .sort({ date: -1 })
      .limit(2)
      .toArray();

    if (!latest) {
      return NextResponse.json({ error: "데이터 없음" }, { status: 503 });
    }

    const calcDiff = (today: number | null, yesterday: number | null) => {
      if (today == null || yesterday == null) return null;
      return Math.round((today - yesterday) * 10) / 10;
    };

    return NextResponse.json(
      {
        national: {
          gasoline: {
            price: latest.national_gasoline ?? null,
            diff: calcDiff(latest.national_gasoline, prev?.national_gasoline ?? null),
          },
          diesel: {
            price: latest.national_diesel ?? null,
            diff: calcDiff(latest.national_diesel, prev?.national_diesel ?? null),
          },
        },
        gwangju: {
          gasoline: {
            price: latest.gwangju_gasoline ?? null,
            diff: calcDiff(latest.gwangju_gasoline, prev?.gwangju_gasoline ?? null),
          },
          diesel: {
            price: latest.gwangju_diesel ?? null,
            diff: calcDiff(latest.gwangju_diesel, prev?.gwangju_diesel ?? null),
          },
        },
        date: latest.date ?? null,
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
