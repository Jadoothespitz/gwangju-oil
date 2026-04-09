/**
 * 수동 데이터 보정 스크립트
 *
 * 1. 한진주유소 → brand: "ALT" (알뜰주유소)
 * 2. 평화셀프주유소 (opinet_id: A0019944) → name: "독도사랑주유소"
 * 4. 코끼리주유소 (opinet_id: A0019786) → isActive: false (오피넷 삭제됨, 영업 여부 불명)
 * 5. 풍암대림주유소 (uni_id: SS0092) → isActive: false (폐업)
 *
 * 사용법: npm run fix:stationdata
 */
import * as dns from "dns";
import * as path from "path";
import { config } from "dotenv";
import { MongoClient } from "mongodb";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
config({ path: path.join(__dirname, "..", ".env.local") });

async function fixStationData() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI 환경 변수를 설정해주세요.");
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db("gwangju-oil");
    const col = db.collection("stations");

    // 1. 한진주유소 → 알뜰주유소
    const hanjin = await col.findOne({ name: { $regex: "한진주유소" } });
    if (hanjin) {
      await col.updateOne(
        { _id: hanjin._id },
        { $set: { brand: "ALT", brandName: "알뜰주유소" } }
      );
      console.log(`✓ 한진주유소 (${hanjin.name}): brand → ALT / brandName → 알뜰주유소`);
    } else {
      console.log("✗ 한진주유소: 찾을 수 없음");
    }

    // 2. 독도사랑주유소 (구 평화셀프주유소, opinet_id: A0019944) → name 수정
    const dokdo = await col.findOne({ opinet_id: "A0019944" });
    if (dokdo) {
      await col.updateOne(
        { _id: dokdo._id },
        { $set: { name: "독도사랑주유소" } }
      );
      console.log(`✓ 독도사랑주유소 (구: ${dokdo.name}): name → 독도사랑주유소`);
    } else {
      console.log("✗ opinet_id A0019944: 찾을 수 없음");
    }

    // 3. 무지개주유소 경훈에너지 (opinet_id: A0019350) → brand: "ETC", brandName: "기타"
    //    오피넷: RTO(자영), 실제 브랜드 불명 → 기타로 분류
    const mujigae = await col.findOne({ opinet_id: "A0019350" });
    if (mujigae) {
      await col.updateOne(
        { _id: mujigae._id },
        { $set: { brand: "ETC", brandName: "기타" } }
      );
      console.log(`✓ 무지개주유소 경훈에너지 (${mujigae.name}): brand → ETC / brandName → 기타`);
    } else {
      console.log("✗ opinet_id A0019350: 찾을 수 없음");
    }

    // 4. 코끼리주유소 (opinet_id: A0019786) → isActive: false
    //    2026-03-05부터 오피넷에서 조회 불가 (detailById 빈 배열 반환), 영업 여부 불명
    const kokkiri = await col.findOne({ opinet_id: "A0019786" });
    if (kokkiri) {
      await col.updateOne(
        { _id: kokkiri._id },
        { $set: { isActive: false } }
      );
      console.log(`✓ 코끼리주유소 (${kokkiri.name}): isActive → false`);
    } else {
      console.log("✗ opinet_id A0019786: 찾을 수 없음");
    }

    // 5. 풍암대림주유소 (uni_id: SS0092) → isActive: false (폐업)
    const pungam = await col.findOne({ uni_id: "SS0092" });
    if (pungam) {
      await col.updateOne(
        { _id: pungam._id },
        { $set: { isActive: false } }
      );
      console.log(`✓ 풍암대림주유소 (${pungam.name}): isActive → false`);
    } else {
      console.log("✗ uni_id SS0092: 찾을 수 없음");
    }

    console.log("\n완료");
  } finally {
    await client.close();
  }
}

fixStationData().catch(console.error);
