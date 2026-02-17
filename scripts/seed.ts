/**
 * 전체 데이터 파이프라인: 상생카드 파싱 → 카카오 지오코딩 → MongoDB 적재
 *
 * 사용법: npm run seed
 *
 * 사전 준비:
 * 1. .env.local에 DATA_GO_KR_API_KEY, KAKAO_REST_API_KEY, MONGODB_URI 설정
 */
import * as dns from "dns";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { MongoClient } from "mongodb";

// ISP DNS가 MongoDB SRV 레코드를 못 찾는 경우 Google DNS 사용
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import { extractDistrict, extractDong } from "../lib/matching/addressNormalizer";
import { getAreaByDong } from "../lib/gwangju/areas";
import { downloadAndParse } from "./downloadSangsaeng";
import { geocodeSangsaengStations } from "./geocodeSangsaeng";

config({ path: path.join(__dirname, "..", ".env.local") });

async function seed() {
  console.log("===== 광주 주유소 데이터 파이프라인 시작 =====\n");

  // Step 1: 상생카드 데이터
  console.log("--- Step 1: 상생카드 가맹점 파싱 ---");
  const sangsaengPath = path.join(__dirname, "data", "sangsaeng-gas-stations.json");
  if (fs.existsSync(sangsaengPath)) {
    console.log("기존 상생카드 데이터 사용 (재다운로드하려면 sangsaeng-gas-stations.json 삭제)");
  } else {
    await downloadAndParse();
  }

  // Step 2: 카카오 지오코딩
  console.log("\n--- Step 2: 카카오 지오코딩 ---");
  const geocodedPath = path.join(__dirname, "data", "geocoded-stations.json");

  let geocoded;
  if (fs.existsSync(geocodedPath)) {
    console.log("기존 지오코딩 결과 사용 (재실행하려면 geocoded-stations.json 삭제)");
    geocoded = JSON.parse(fs.readFileSync(geocodedPath, "utf-8"));
  } else {
    geocoded = await geocodeSangsaengStations();
  }

  console.log(`지오코딩된 주유소: ${geocoded.length}개`);

  // Step 3: MongoDB 적재
  console.log("\n--- Step 3: MongoDB 적재 ---");
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI 환경 변수를 설정해주세요.");
    console.log("\n지오코딩 결과는 scripts/data/geocoded-stations.json에 저장됩니다.");
    return;
  }

  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    console.log("MongoDB 연결 성공");

    const db = client.db("gwangju-gas");
    const collection = db.collection("stations");

    // 기존 데이터 정리
    await collection.deleteMany({});

    const now = new Date().toISOString();
    const documents = geocoded.map((station: any, index: number) => {
      const district = station.district || extractDistrict(station.address) || "광산구";
      const dong = station.dong || extractDong(station.address) || "";
      const area = station.area || (dong ? getAreaByDong(dong) : undefined);

      // 상생카드 주유소 고유 ID 생성
      const stationId = `SS${String(index + 1).padStart(4, "0")}`;

      return {
        uni_id: stationId,
        name: station.name,
        brand: "",
        brandName: station.category || "주유소",
        address: station.address,
        addressOld: "",
        district,
        dong,
        area,
        location: {
          type: "Point" as const,
          coordinates: [station.lng, station.lat],
        },
        prices: {
          gasoline: undefined,
          diesel: undefined,
          updatedAt: now,
        },
        sangsaeng: {
          matched: true,
          merchantName: station.name,
          merchantAddress: station.address,
        },
        isActive: true,
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      };
    });

    if (documents.length > 0) {
      await collection.insertMany(documents);
    }

    // 인덱스 생성
    await collection.createIndex({ location: "2dsphere" });
    await collection.createIndex({ uni_id: 1 }, { unique: true });
    await collection.createIndex({ district: 1, "prices.gasoline": 1 });
    await collection.createIndex({ district: 1, "prices.diesel": 1 });
    await collection.createIndex({ dong: 1 });
    await collection.createIndex({ "sangsaeng.matched": 1 });

    console.log(`\nMongoDB에 ${documents.length}개 상생카드 가맹 주유소 적재 완료`);

    // 구별 통계
    const districtStats = documents.reduce((acc: Record<string, number>, d: any) => {
      acc[d.district] = (acc[d.district] || 0) + 1;
      return acc;
    }, {});
    console.log("\n구별 분포:");
    for (const [dist, count] of Object.entries(districtStats).sort()) {
      console.log(`  ${dist}: ${count}개`);
    }
  } finally {
    await client.close();
  }

  console.log("\n===== 데이터 파이프라인 완료 =====");
}

seed().catch(console.error);
