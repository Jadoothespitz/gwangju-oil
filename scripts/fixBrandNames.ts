/**
 * brandName이 "주유소"(브랜드 불명)인 레코드를
 * brand(POLL_DIV_CD) 코드 기반으로 정확한 이름으로 보정
 *
 * 사용법: npm run fix:brands
 */
import * as dns from "dns";
import * as path from "path";
import { config } from "dotenv";
import { MongoClient } from "mongodb";
import { BRAND_NAMES } from "../types";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
config({ path: path.join(__dirname, "..", ".env.local") });

async function fixBrandNames() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI 환경 변수를 설정해주세요.");
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db("gwangju-oil");
    const collection = db.collection("stations");

    // brandName이 "주유소"인 문서 조회
    const stations = await collection
      .find({ brandName: "주유소" })
      .toArray();

    console.log(`brandName "주유소" → ${stations.length}개 발견\n`);

    let fixed = 0;
    let skipped = 0;

    for (const station of stations) {
      const code = station.brand;
      const newName = code ? BRAND_NAMES[code] : null;

      if (newName) {
        await collection.updateOne(
          { _id: station._id },
          { $set: { brandName: newName } }
        );
        console.log(`  ✓ ${station.name}: "주유소" → "${newName}" (${code})`);
        fixed++;
      } else {
        console.log(`  ✗ ${station.name}: brand 코드 없음 (skip)`);
        skipped++;
      }
    }

    console.log(`\n완료: ${fixed}개 수정, ${skipped}개 skip`);
  } finally {
    await client.close();
  }
}

fixBrandNames().catch(console.error);
