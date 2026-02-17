/**
 * 상생카드 가맹 주유소 주소를 카카오 지오코딩으로 좌표 변환
 *
 * 사용법: npm run seed:geocode
 */
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import type { SangsaengMerchant } from "../types";
import { extractDistrict, extractDong } from "../lib/matching/addressNormalizer";
import { getAreaByDong } from "../lib/gwangju/areas";

config({ path: path.join(__dirname, "..", ".env.local") });

const DATA_DIR = path.join(__dirname, "data");

interface GeocodedStation {
  name: string;
  category: string;
  address: string;
  district: string;
  dong: string;
  area?: string;
  lat: number;
  lng: number;
  dataDate: string;
}

async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number; roadAddress?: string } | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) throw new Error("KAKAO_REST_API_KEY 환경 변수를 설정해주세요.");

  // 먼저 키워드 검색으로 시도 (주유소 이름+주소가 더 정확할 수 있음)
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
  const resp = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });

  if (!resp.ok) {
    console.error(`  카카오 API 오류: ${resp.status} for "${address}"`);
    return null;
  }

  const data = await resp.json();
  const doc = data.documents?.[0];

  if (!doc) {
    // 주소 검색 실패 시 키워드 검색 시도
    const kwUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(address + " 주유소")}`;
    const kwResp = await fetch(kwUrl, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });

    if (kwResp.ok) {
      const kwData = await kwResp.json();
      const kwDoc = kwData.documents?.[0];
      if (kwDoc) {
        return {
          lat: parseFloat(kwDoc.y),
          lng: parseFloat(kwDoc.x),
          roadAddress: kwDoc.road_address_name || kwDoc.address_name,
        };
      }
    }
    return null;
  }

  return {
    lat: parseFloat(doc.y),
    lng: parseFloat(doc.x),
    roadAddress: doc.road_address?.address_name || doc.address_name,
  };
}

// 중복 제거 (같은 주소의 중복 항목)
function deduplicateStations(
  merchants: SangsaengMerchant[]
): SangsaengMerchant[] {
  const seen = new Map<string, SangsaengMerchant>();

  for (const m of merchants) {
    // 주소 기반으로 중복 판별 (주소가 없으면 이름)
    const key = m.address || m.name;
    if (!seen.has(key)) {
      seen.set(key, m);
    }
  }

  return [...seen.values()];
}

export async function geocodeSangsaengStations(): Promise<GeocodedStation[]> {
  // 상생카드 파싱 결과 로드
  const jsonPath = path.join(DATA_DIR, "sangsaeng-gas-stations.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("상생카드 파싱 결과가 없습니다. 먼저 seed:download를 실행하세요.");
    process.exit(1);
  }

  const rawMerchants: SangsaengMerchant[] = JSON.parse(
    fs.readFileSync(jsonPath, "utf-8")
  );

  console.log(`원본 상생카드 주유소: ${rawMerchants.length}개`);

  const merchants = deduplicateStations(rawMerchants);
  console.log(`중복 제거 후: ${merchants.length}개`);

  const results: GeocodedStation[] = [];
  let success = 0;
  let fail = 0;

  for (let i = 0; i < merchants.length; i++) {
    const m = merchants[i];
    process.stdout.write(
      `  [${i + 1}/${merchants.length}] ${m.name} ... `
    );

    // API 호출 간 딜레이 (카카오 API rate limit 방지)
    if (i > 0) await new Promise((r) => setTimeout(r, 200));

    const geo = await geocodeAddress(m.address);

    if (geo && geo.lat > 0) {
      const district = extractDistrict(m.address) || "광산구";
      const dong = extractDong(m.address) || "";
      const area = dong ? getAreaByDong(dong) : undefined;

      results.push({
        name: m.name,
        category: m.category,
        address: m.address,
        district,
        dong,
        area,
        lat: geo.lat,
        lng: geo.lng,
        dataDate: m.dataDate,
      });
      success++;
      console.log(`OK (${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)})`);
    } else {
      fail++;
      console.log("FAIL");
    }
  }

  console.log(`\n=== 지오코딩 결과 ===`);
  console.log(`성공: ${success}개 / 실패: ${fail}개`);

  // 결과 저장
  const outputPath = path.join(DATA_DIR, "geocoded-stations.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`결과 저장: ${outputPath}`);

  return results;
}

// 직접 실행 시만 (seed.ts에서 import할 때는 실행 안 됨)
if (require.main === module) {
  geocodeSangsaengStations().catch(console.error);
}
