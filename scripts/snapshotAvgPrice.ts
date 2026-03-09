/**
 * 전국/광주 평균 유가 스냅샷
 *
 * MongoDB avg_price_snapshot 컬렉션에 오늘 평균 유가를 저장한다.
 * 날짜가 바뀌면 현재 값을 prev로 이동 → 전일 대비 diff 계산 가능해짐.
 *
 * 사용법: npm run prices:snapshot
 */
import * as dns from "dns";
import * as path from "path";
import { config } from "dotenv";
import { MongoClient } from "mongodb";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
config({ path: path.join(__dirname, "..", ".env.local") });

const API_KEY = process.env.OPINET_API_KEY!;

async function fetchAvgPrices() {
  const url = `https://www.opinet.co.kr/api/avgSidoPrice.do?code=${API_KEY}&out=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`오피넷 API 오류: ${res.status}`);
  const json = await res.json();
  const items: Array<{ SIDONM: string; PRODCD: string; PRICE: number }> = json.RESULT.OIL;

  const get = (sidonm: string, prodcd: string) =>
    items.find((d) => d.SIDONM === sidonm && d.PRODCD === prodcd)?.PRICE ?? null;

  return {
    national_gasoline: get("전국", "B027"),
    national_diesel:   get("전국", "D047"),
    gwangju_gasoline:  get("광주", "B027"),
    gwangju_diesel:    get("광주", "D047"),
  };
}

async function snapshotAvgPrice() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) { console.error("MONGODB_URI 환경 변수를 설정해주세요."); process.exit(1); }
  if (!API_KEY)  { console.error("OPINET_API_KEY 환경 변수를 설정해주세요."); process.exit(1); }

  // 오늘 날짜 (KST, YYYYMMDD)
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString().slice(0, 10).replace(/-/g, "");

  const prices = await fetchAvgPrices();
  console.log(`오늘(${today}) 가격:`, prices);

  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const col = client.db("gwangju-oil").collection("avg_price_snapshot");

    const existing = await col.findOne({ key: "daily" });
    const isNewDay = !existing || existing.date !== today;

    await col.updateOne(
      { key: "daily" },
      {
        $set: {
          key: "daily",
          date: today,
          national_gasoline: prices.national_gasoline,
          national_diesel:   prices.national_diesel,
          gwangju_gasoline:  prices.gwangju_gasoline,
          gwangju_diesel:    prices.gwangju_diesel,
          // 날짜가 바뀐 경우에만 prev 로테이션
          ...(isNewDay && {
            prev_date:               existing?.date                ?? null,
            prev_national_gasoline:  existing?.national_gasoline   ?? null,
            prev_national_diesel:    existing?.national_diesel      ?? null,
            prev_gwangju_gasoline:   existing?.gwangju_gasoline     ?? null,
            prev_gwangju_diesel:     existing?.gwangju_diesel       ?? null,
          }),
        },
      },
      { upsert: true }
    );

    if (isNewDay && existing) {
      const fmtDiff = (a: number | null, b: number | null) => {
        if (a == null || b == null) return "-";
        const d = Math.round((b - a) * 10) / 10;
        return d > 0 ? `+${d}` : `${d}`;
      };
      console.log("전일 대비 등락:");
      console.log(`  전국 휘발유: ${fmtDiff(existing.national_gasoline, prices.national_gasoline)}`);
      console.log(`  전국 경유:   ${fmtDiff(existing.national_diesel,   prices.national_diesel)}`);
      console.log(`  광주 휘발유: ${fmtDiff(existing.gwangju_gasoline,  prices.gwangju_gasoline)}`);
      console.log(`  광주 경유:   ${fmtDiff(existing.gwangju_diesel,    prices.gwangju_diesel)}`);
    } else if (!isNewDay) {
      console.log("오늘 이미 실행됨 — 현재 가격만 업데이트 (prev 유지)");
    } else {
      console.log("첫 실행 — 내일부터 diff 표시 가능");
    }

    console.log("\n스냅샷 저장 완료");
  } finally {
    await client.close();
  }
}

snapshotAvgPrice().catch(console.error);
