/**
 * 주유소 가격 갱신
 *
 * 사용법: npm run prices:refresh
 *
 * aroundAll.do로 광주 전체 주유소 가격을 일괄 수집 후
 * opinet_id가 매칭된 주유소의 가격을 업데이트합니다.
 */
import * as dns from "dns";
import * as path from "path";
import { config } from "dotenv";
import { MongoClient } from "mongodb";
import { wgs84ToKatec } from "../lib/geo/coordinateConverter";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
config({ path: path.join(__dirname, "..", ".env.local") });

const API_KEY = process.env.OPINET_API_KEY!;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const GWANGJU_CENTERS = [
  { name: "광산구 중심", lat: 35.1397, lng: 126.7930 },
  { name: "광산구 남부", lat: 35.1100, lng: 126.7930 },
  { name: "광산구 북서부", lat: 35.1800, lng: 126.7700 },
  { name: "서구", lat: 35.1487, lng: 126.8560 },
  { name: "북구 중심", lat: 35.1740, lng: 126.9120 },
  { name: "북구 북부", lat: 35.2100, lng: 126.8900 },
  { name: "동구", lat: 35.1460, lng: 126.9230 },
  { name: "남구 중심", lat: 35.1330, lng: 126.9020 },
  { name: "남구 남부", lat: 35.1050, lng: 126.8800 },
];
const SEARCH_RADIUS = 8000;

async function refreshPrices() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI 환경 변수를 설정해주세요.");
    process.exit(1);
  }
  if (!API_KEY) {
    console.error("OPINET_API_KEY 환경 변수를 설정해주세요.");
    process.exit(1);
  }

  // aroundAll.do로 가격 수집 (휘발유 + 경유)
  console.log("오피넷 가격 수집 중...");

  const gasolinePrices = new Map<string, number>();
  const dieselPrices = new Map<string, number>();

  for (const center of GWANGJU_CENTERS) {
    const katec = wgs84ToKatec(center.lng, center.lat);

    // 휘발유
    const gasUrl = `https://www.opinet.co.kr/api/aroundAll.do?code=${API_KEY}&out=json&x=${Math.round(katec.x)}&y=${Math.round(katec.y)}&radius=${SEARCH_RADIUS}&prodcd=B027&sort=1`;
    const gasRes = await fetch(gasUrl);
    const gasData = await gasRes.json();
    for (const s of gasData.RESULT?.OIL || []) {
      gasolinePrices.set(s.UNI_ID, s.PRICE);
    }
    await delay(300);

    // 경유
    const dslUrl = `https://www.opinet.co.kr/api/aroundAll.do?code=${API_KEY}&out=json&x=${Math.round(katec.x)}&y=${Math.round(katec.y)}&radius=${SEARCH_RADIUS}&prodcd=D047&sort=1`;
    const dslRes = await fetch(dslUrl);
    const dslData = await dslRes.json();
    for (const s of dslData.RESULT?.OIL || []) {
      dieselPrices.set(s.UNI_ID, s.PRICE);
    }
    await delay(300);
  }

  console.log(`  휘발유 가격: ${gasolinePrices.size}개, 경유 가격: ${dieselPrices.size}개`);

  // DB 업데이트
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db("gwangju-oil");
    const collection = db.collection("stations");

    const stations = await collection
      .find(
        { isActive: true, opinet_id: { $exists: true, $ne: null } },
        { projection: { opinet_id: 1 } }
      )
      .toArray();

    console.log(`${stations.length}개 주유소 가격 갱신 시작...`);

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

    console.log(`\n가격 갱신 완료: ${updated}개 성공`);
  } finally {
    await client.close();
  }
}

refreshPrices().catch(console.error);
