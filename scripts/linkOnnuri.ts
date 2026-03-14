/**
 * 온누리상품권 가맹 주유소 DB 마킹
 *
 * 사용법: npm run onnuri:link
 *
 * output_final.json의 opinet_station_id 기준으로 DB 주유소를 찾아
 * onnuri: true 로 마킹한다.
 */
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { MongoClient } from "mongodb";

config({ path: path.join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI!;
const OUTPUT_FINAL = path.join(__dirname, "data", "output_final.json");

interface OnnuriEntry {
  가맹점명: string;
  소속시장명: string;
  opinet_station_id: string;
  opinet_상호: string;
  match_score: number;
}

async function main() {
  const entries: OnnuriEntry[] = JSON.parse(
    fs.readFileSync(OUTPUT_FINAL, "utf-8")
  );
  console.log(`온누리 가맹점 목록: ${entries.length}건\n`);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const col = client.db("gwangju-oil").collection("stations");

  // 기존 onnuri: true 전부 초기화 (재실행 시 중복 방지)
  const cleared = await col.updateMany(
    { onnuri: true },
    { $unset: { onnuri: "" } }
  );
  if (cleared.modifiedCount > 0) {
    console.log(`기존 온누리 마킹 ${cleared.modifiedCount}건 초기화\n`);
  }

  let matched = 0;
  let notFound = 0;

  for (const entry of entries) {
    const result = await col.updateOne(
      { opinet_id: entry.opinet_station_id },
      { $set: { onnuri: true, updatedAt: new Date().toISOString() } }
    );

    if (result.matchedCount > 0) {
      console.log(
        `  ✓ ${entry.가맹점명} (${entry.opinet_station_id}) → ${entry.opinet_상호}`
      );
      matched++;
    } else {
      console.log(
        `  ✗ NOT FOUND: ${entry.가맹점명} (${entry.opinet_station_id})`
      );
      notFound++;
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`  매칭: ${matched}건`);
  if (notFound > 0) {
    console.log(`  미매칭: ${notFound}건 (DB에 opinet_id 없음 — opinet:link 먼저 실행 필요)`);
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
