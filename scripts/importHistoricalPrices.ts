/**
 * 오피넷 CSV 데이터 → MongoDB avg_price_snapshot 일괄 임포트
 *
 * 사용법:
 *   1. 프로젝트 루트에 CSV 파일 3개 놓기:
 *      - gasprice_gwangju.csv     (광주 휘발유)
 *      - dieselprice_gwangju.csv  (광주 경유)
 *      - fuelprice_national.csv   (전국 휘발유+경유)
 *   2. npm run prices:import
 *
 * 같은 날짜가 이미 있으면 덮어쓰지 않음 ($setOnInsert → upsert).
 * --overwrite 플래그 사용 시 기존 데이터도 덮어씀.
 */
import * as fs from "fs";
import * as path from "path";
import * as dns from "dns";
import { config } from "dotenv";
import { MongoClient } from "mongodb";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
config({ path: path.join(__dirname, "..", ".env.local") });

const OVERWRITE = process.argv.includes("--overwrite");
const ROOT = path.join(__dirname, "..");

// "2025년04월01일" → "20250401"
function parseKoreanDate(s: string): string {
  const m = s.match(/(\d{4})년(\d{2})월(\d{2})일/);
  if (!m) throw new Error(`날짜 파싱 실패: "${s}"`);
  return `${m[1]}${m[2]}${m[3]}`;
}

function readCsv(filename: string): string[][] {
  const filepath = path.join(ROOT, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`파일 없음: ${filepath}\n프로젝트 루트에 CSV 파일을 놓아주세요.`);
  }
  const buf = fs.readFileSync(filepath);
  const text = new TextDecoder("euc-kr").decode(buf);
  return text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .slice(1) // 헤더 제거
    .map(l => l.split(",").map(c => c.trim()));
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) { console.error("MONGODB_URI 환경 변수를 설정해주세요."); process.exit(1); }

  console.log("CSV 파일 파싱 중...");

  const byDate = new Map<string, {
    gwangju_gasoline?: number;
    gwangju_diesel?: number;
    national_gasoline?: number;
    national_diesel?: number;
  }>();

  const set = (date: string, key: string, value: number) => {
    if (!byDate.has(date)) byDate.set(date, {});
    (byDate.get(date) as Record<string, number>)[key] = value;
  };

  for (const [dateStr, valueStr] of readCsv("gasprice_gwangju.csv")) {
    set(parseKoreanDate(dateStr), "gwangju_gasoline", parseFloat(valueStr));
  }
  for (const [dateStr, valueStr] of readCsv("dieselprice_gwangju.csv")) {
    set(parseKoreanDate(dateStr), "gwangju_diesel", parseFloat(valueStr));
  }
  for (const [dateStr, gasStr, dieStr] of readCsv("fuelprice_national.csv")) {
    const date = parseKoreanDate(dateStr);
    set(date, "national_gasoline", parseFloat(gasStr));
    set(date, "national_diesel", parseFloat(dieStr));
  }

  const dates = [...byDate.keys()].sort();
  console.log(`파싱 완료: ${dates.length}일치 (${dates[0]} ~ ${dates[dates.length - 1]})`);
  if (OVERWRITE) console.log("※ --overwrite 모드: 기존 데이터 덮어씀");

  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const col = client.db("gwangju-oil").collection("avg_price_snapshot");

    let inserted = 0;
    let skipped = 0;
    let overwritten = 0;

    for (const [date, prices] of byDate) {
      if (OVERWRITE) {
        const result = await col.updateOne(
          { date },
          { $set: { date, ...prices } },
          { upsert: true }
        );
        if (result.upsertedCount) inserted++;
        else overwritten++;
      } else {
        // 없는 날짜만 삽입
        const result = await col.updateOne(
          { date },
          { $setOnInsert: { date, ...prices } },
          { upsert: true }
        );
        if (result.upsertedCount) inserted++;
        else skipped++;
      }
    }

    console.log(`\n완료!`);
    if (inserted) console.log(`  신규 삽입: ${inserted}건`);
    if (overwritten) console.log(`  덮어쓰기: ${overwritten}건`);
    if (skipped) console.log(`  기존 유지: ${skipped}건 (--overwrite로 덮어쓸 수 있음)`);
  } finally {
    await client.close();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
