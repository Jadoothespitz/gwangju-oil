/**
 * 오피넷 주유소 ↔ 상생카드 주유소 매칭 + 실시간 유가 연동
 *
 * 사용법: npm run opinet:link
 *
 * 1. 오피넷 API로 광주 전체 주유소 수집 (aroundAll + detailById)
 * 2. DB 상생카드 주유소와 매칭 (주소, 이름, 좌표)
 * 3. 매칭된 주유소에 opinet_id + 가격 저장
 */
import * as dns from "dns";
import * as path from "path";
import { config } from "dotenv";
import { MongoClient } from "mongodb";
import type { OpinetStation, SangsaengMerchant, BRAND_NAMES } from "../types";
import type { OpinetStationDetail } from "../lib/opinet/types";
import { matchStations } from "../lib/matching/matcher";
import { wgs84ToKatec, katecToWgs84 } from "../lib/geo/coordinateConverter";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
config({ path: path.join(__dirname, "..", ".env.local") });

const API_KEY = process.env.OPINET_API_KEY!;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 광주 수집 포인트 (WGS84) — 5개 구 중심 + 외곽 보완
const GWANGJU_CENTERS = [
  { name: "광산구 중심", lat: 35.1397, lng: 126.7930 },
  { name: "광산구 북부", lat: 35.1900, lng: 126.7800 },
  { name: "광산구 서부(삼도)", lat: 35.1633, lng: 126.6988 },
  { name: "서구", lat: 35.1487, lng: 126.8560 },
  { name: "북구", lat: 35.1740, lng: 126.9120 },
  { name: "북구 북부", lat: 35.2100, lng: 126.9100 },
  { name: "동구", lat: 35.1460, lng: 126.9230 },
  { name: "남구", lat: 35.1330, lng: 126.9020 },
  { name: "남구 남부", lat: 35.1000, lng: 126.8900 },
];

/** Phase A: 오피넷 광주 주유소 전체 수집 */
async function fetchAllOpinetStations(): Promise<{
  stations: OpinetStation[];
  priceMap: Map<string, { gasoline?: number; diesel?: number }>;
}> {
  console.log("=== Phase A: 오피넷 광주 주유소 수집 ===\n");

  // Step 1: aroundAll.do로 고유 ID 수집 (휘발유 + 경유)
  const allIds = new Set<string>();

  for (const prodcd of ["B027", "D047"]) {
    const label = prodcd === "B027" ? "휘발유" : "경유";
    console.log(`  [${label}] 수집 시작`);
    for (const center of GWANGJU_CENTERS) {
      const katec = wgs84ToKatec(center.lng, center.lat);
      const url = `https://www.opinet.co.kr/api/aroundAll.do?code=${API_KEY}&out=json&x=${Math.round(katec.x)}&y=${Math.round(katec.y)}&radius=5000&prodcd=${prodcd}&sort=1`;
      const res = await fetch(url);
      const data = await res.json();
      const stations = data.RESULT?.OIL || [];
      const newCount = stations.filter((s: any) => !allIds.has(s.UNI_ID)).length;
      stations.forEach((s: any) => allIds.add(s.UNI_ID));
      if (newCount > 0) {
        console.log(`    ${center.name}: ${stations.length}개 (신규 ${newCount}개)`);
      }
      await delay(300);
    }
  }

  console.log(`\n  총 ${allIds.size}개 고유 주유소 발견`);

  // Step 1.5: 수동 오버라이드 ID 중 미수집된 것 추가
  const { MANUAL_OVERRIDES } = await import("../lib/matching/manualOverrides");
  const manualIds = Object.values(MANUAL_OVERRIDES);
  const missingManualIds = manualIds.filter((id) => !allIds.has(id));
  if (missingManualIds.length > 0) {
    console.log(`  수동 오버라이드에서 미수집 ${missingManualIds.length}개 추가`);
    for (const id of missingManualIds) {
      allIds.add(id);
    }
  }

  // Step 2: detailById.do로 상세 정보 + 가격 수집
  console.log(`  상세 정보 수집 중... (${allIds.size}개)\n`);

  const stations: OpinetStation[] = [];
  const priceMap = new Map<string, { gasoline?: number; diesel?: number }>();
  let count = 0;

  for (const id of allIds) {
    const url = `https://www.opinet.co.kr/api/detailById.do?code=${API_KEY}&out=json&id=${id}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      const detail: OpinetStationDetail = data.RESULT?.OIL?.[0];

      if (detail) {
        stations.push({
          UNI_ID: detail.UNI_ID,
          OS_NM: detail.OS_NM,
          POLL_DIV_CD: detail.POLL_DIV_CD,
          NEW_ADR: detail.NEW_ADR,
          VAN_ADR: detail.VAN_ADR,
          TEL: detail.TEL,
          GIS_X_COOR: detail.GIS_X_COOR,
          GIS_Y_COOR: detail.GIS_Y_COOR,
        });

        // 가격 추출
        const prices: { gasoline?: number; diesel?: number } = {};
        if (detail.OIL_PRICE) {
          for (const p of detail.OIL_PRICE) {
            if (p.PRODCD === "B027") prices.gasoline = p.PRICE;
            if (p.PRODCD === "D047") prices.diesel = p.PRICE;
          }
        }
        priceMap.set(detail.UNI_ID, prices);
      }
    } catch {
      console.log(`  [오류] ${id} 상세 조회 실패`);
    }

    count++;
    if (count % 20 === 0) {
      console.log(`  ${count}/${allIds.size}...`);
    }
    await delay(200);
  }

  console.log(`\n  수집 완료: ${stations.length}개 주유소, ${priceMap.size}개 가격`);
  return { stations, priceMap };
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI 환경 변수를 설정해주세요.");
    process.exit(1);
  }
  if (!API_KEY) {
    console.error("OPINET_API_KEY 환경 변수를 설정해주세요.");
    process.exit(1);
  }

  // Phase A: 오피넷 데이터 수집
  const { stations: opinetList, priceMap } = await fetchAllOpinetStations();

  // Phase B: DB 주유소와 매칭
  console.log("\n=== Phase B: DB 주유소와 매칭 ===\n");

  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db("gwangju-gas");
    const collection = db.collection("stations");

    const dbStations = await collection.find({ isActive: true }).toArray();
    console.log(`  DB 주유소: ${dbStations.length}개`);
    console.log(`  오피넷 주유소: ${opinetList.length}개\n`);

    // DB 주유소를 SangsaengMerchant 형식으로 변환
    const sangsaengList: SangsaengMerchant[] = dbStations.map((s) => ({
      name: s.sangsaeng?.merchantName || s.name,
      category: s.brandName || "",
      address: s.sangsaeng?.merchantAddress || s.address,
      dataDate: "",
    }));

    // 좌표 맵 구성
    const sangsaengCoords = new Map<string, { lat: number; lng: number }>();
    for (const s of dbStations) {
      const name = s.sangsaeng?.merchantName || s.name;
      if (s.location?.coordinates) {
        const [lng, lat] = s.location.coordinates;
        sangsaengCoords.set(name, { lat, lng });
      }
    }

    const opinetCoords = new Map<string, { lat: number; lng: number }>();
    for (const s of opinetList) {
      if (s.GIS_X_COOR && s.GIS_Y_COOR) {
        if (s.GIS_X_COOR > 1000) {
          opinetCoords.set(s.UNI_ID, katecToWgs84(s.GIS_X_COOR, s.GIS_Y_COOR));
        } else {
          opinetCoords.set(s.UNI_ID, { lat: s.GIS_Y_COOR, lng: s.GIS_X_COOR });
        }
      }
    }

    // 매칭 실행
    const { matched, unmatched } = matchStations(
      sangsaengList,
      opinetList,
      opinetCoords,
      sangsaengCoords
    );

    // 매칭 통계
    const methodCounts: Record<string, number> = {};
    for (const m of matched) {
      methodCounts[m.method] = (methodCounts[m.method] || 0) + 1;
    }

    console.log(`  매칭 성공: ${matched.length}개`);
    console.log(`  매칭 실패: ${unmatched.length}개`);
    console.log(`  매칭률: ${((matched.length / dbStations.length) * 100).toFixed(1)}%`);
    console.log(`\n  매칭 방법별:`);
    for (const [method, count] of Object.entries(methodCounts)) {
      console.log(`    ${method}: ${count}개`);
    }

    // Phase C: DB 업데이트
    console.log("\n=== Phase C: DB 업데이트 ===\n");

    let updated = 0;
    const now = new Date().toISOString();

    for (const match of matched) {
      if (!match.opinet) continue;

      // DB 문서 찾기 (이름으로 매칭)
      const dbStation = dbStations.find(
        (s) => (s.sangsaeng?.merchantName || s.name) === match.sangsaeng.name
      );
      if (!dbStation) continue;

      const prices = priceMap.get(match.opinet.UNI_ID) || {};

      await collection.updateOne(
        { _id: dbStation._id },
        {
          $set: {
            opinet_id: match.opinet.UNI_ID,
            brand: match.opinet.POLL_DIV_CD,
            "sangsaeng.matchScore": match.score,
            "sangsaeng.matchMethod": match.method,
            ...(prices.gasoline != null && { "prices.gasoline": prices.gasoline }),
            ...(prices.diesel != null && { "prices.diesel": prices.diesel }),
            "prices.updatedAt": now,
            lastSyncedAt: now,
            updatedAt: now,
          },
        }
      );
      updated++;
    }

    console.log(`  ${updated}개 주유소 업데이트 완료`);

    // 미매칭 목록 (전체)
    if (unmatched.length > 0) {
      console.log(`\n  미매칭 (${unmatched.length}개):`);
      unmatched.forEach((m, i) => {
        // 가장 가까운 오피넷 주유소 찾기 (디버깅용)
        const coord = sangsaengCoords.get(m.name);
        let nearest = "";
        if (coord && opinetCoords) {
          let minDist = Infinity;
          let nearestStation: OpinetStation | null = null;
          for (const op of opinetList) {
            const oc = opinetCoords.get(op.UNI_ID);
            if (!oc) continue;
            const d = Math.sqrt((coord.lat - oc.lat) ** 2 + (coord.lng - oc.lng) ** 2) * 111000;
            if (d < minDist) {
              minDist = d;
              nearestStation = op;
            }
          }
          if (nearestStation) {
            nearest = ` → 가장 가까운 오피넷: ${nearestStation.OS_NM} (${nearestStation.UNI_ID}, ~${Math.round(minDist)}m)`;
          }
        }
        console.log(`    ${i + 1}. ${m.name} | ${m.address}${nearest}`);
      });
    }

    // 가격 통계
    const withGasoline = await collection.countDocuments({
      isActive: true,
      "prices.gasoline": { $exists: true, $ne: null },
    });
    const withDiesel = await collection.countDocuments({
      isActive: true,
      "prices.diesel": { $exists: true, $ne: null },
    });
    console.log(`\n  가격 보유: 휘발유 ${withGasoline}개, 경유 ${withDiesel}개`);
  } finally {
    await client.close();
  }

  console.log("\n===== 완료 =====");
}

main().catch(console.error);
