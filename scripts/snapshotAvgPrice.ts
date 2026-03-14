/**
 * 전국/광주 평균 유가 스냅샷
 *
 * MongoDB avg_price_snapshot 컬렉션에 오늘 평균 유가를 날짜별로 저장한다.
 * 365일보다 오래된 도큐먼트는 자동 삭제.
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

function kstToday() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString().slice(0, 10).replace(/-/g, "");
}

function kstYesterday() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10).replace(/-/g, "");
}

async function snapshotAvgPrice() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) { console.error("MONGODB_URI 환경 변수를 설정해주세요."); process.exit(1); }
  if (!API_KEY)  { console.error("OPINET_API_KEY 환경 변수를 설정해주세요."); process.exit(1); }

  const today = kstToday();
  const yesterday = kstYesterday();

  const prices = await fetchAvgPrices();
  console.log(`오늘(${today}) 가격:`, prices);

  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const col = client.db("gwangju-oil").collection("avg_price_snapshot");

    // 날짜별 upsert (같은 날 재실행 시 덮어쓰기)
    await col.updateOne(
      { date: today },
      { $set: { date: today, ...prices } },
      { upsert: true }
    );

    // 365일 이전 도큐먼트 삭제
    const cutoff = new Date(Date.now() + 9 * 60 * 60 * 1000 - 365 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10).replace(/-/g, "");
    const { deletedCount } = await col.deleteMany({ date: { $lt: cutoff } });
    if (deletedCount > 0) console.log(`만료된 스냅샷 ${deletedCount}건 삭제 (기준: ${cutoff})`);

    // 전일 대비 diff 콘솔 출력
    const prev = await col.findOne({ date: yesterday });
    if (prev) {
      const fmtDiff = (a: number | null, b: number | null) => {
        if (a == null || b == null) return "-";
        const d = Math.round((b - a) * 10) / 10;
        return d > 0 ? `+${d}` : `${d}`;
      };
      console.log("전일 대비 등락:");
      console.log(`  전국 휘발유: ${fmtDiff(prev.national_gasoline, prices.national_gasoline)}`);
      console.log(`  전국 경유:   ${fmtDiff(prev.national_diesel,   prices.national_diesel)}`);
      console.log(`  광주 휘발유: ${fmtDiff(prev.gwangju_gasoline,  prices.gwangju_gasoline)}`);
      console.log(`  광주 경유:   ${fmtDiff(prev.gwangju_diesel,    prices.gwangju_diesel)}`);
    } else {
      console.log("전일 데이터 없음 — 내일부터 diff 표시 가능");
    }

    console.log("\n스냅샷 저장 완료");
  } finally {
    await client.close();
  }
}

snapshotAvgPrice().catch(console.error);
