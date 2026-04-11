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

  // 1단계: 마킹 (먼저 set — 실패해도 기존 데이터 보존)
  let matched = 0;
  const notFoundList: OnnuriEntry[] = [];
  const matchedIds: string[] = [];

  for (const entry of entries) {
    const result = await col.updateOne(
      { opinet_id: entry.opinet_station_id },
      { $set: { onnuri: true, updatedAt: new Date().toISOString() } }
    );

    if (result.matchedCount > 0) {
      console.log(
        `  ✓ ${entry.가맹점명} (${entry.opinet_station_id}) → ${entry.opinet_상호}`
      );
      matchedIds.push(entry.opinet_station_id);
      matched++;
    } else {
      notFoundList.push(entry);
    }
  }

  // 2단계: 이번 목록에 없는 주유소의 onnuri 플래그만 제거
  const cleared = await col.updateMany(
    { onnuri: true, opinet_id: { $nin: matchedIds } },
    { $unset: { onnuri: "" } }
  );
  if (cleared.modifiedCount > 0) {
    console.log(`\n온누리 목록에서 제외된 주유소 ${cleared.modifiedCount}건 마킹 해제`);
  }

  console.log(`\n=== 완료 ===`);
  console.log(`  매칭: ${matched}건`);
  if (notFoundList.length > 0) {
    console.log(`  미매칭: ${notFoundList.length}건 (DB에 opinet_id 없음 — opinet:link 먼저 실행 필요)\n`);
    console.log(`--- 미매칭 목록 ---`);
    for (const e of notFoundList) {
      console.log(`  ${e.가맹점명} | ${e.opinet_station_id} | ${e.소속시장명}`);
    }
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
