/**
 * 상생카드 가맹점 데이터 다운로드 및 파싱
 *
 * 사용법: npm run seed:download
 *
 * 1. data.go.kr OpenAPI에서 주유소 가맹점 수집
 * 2. 같은 주소의 중복 항목 병합
 * 3. 카카오맵 키워드 검색으로 상호명 + 주소 보완
 *
 * .env.local에 DATA_GO_KR_API_KEY, KAKAO_REST_API_KEY 설정 필요
 */
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import type { SangsaengMerchant } from "../types";

config({ path: path.join(__dirname, "..", ".env.local") });

const DATA_DIR = path.join(__dirname, "data");
const API_URL =
  "https://api.odcloud.kr/api/15138321/v1/uddi:881954b2-cdac-4e68-aa3c-896d7d8ab455";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 주소 정규화 (중복 판별용) */
function normalizeAddress(addr: string): string {
  return addr.replace(/\s+/g, " ").trim();
}

/** Step 1: data.go.kr에서 상생카드 가맹점 수집 */
async function fetchFromApi(): Promise<SangsaengMerchant[]> {
  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) {
    console.error("DATA_GO_KR_API_KEY 환경 변수를 설정해주세요.");
    console.error(
      "https://www.data.go.kr/data/15138321/fileData.do 에서 활용신청 후 API 키 발급"
    );
    process.exit(1);
  }

  console.log("--- Step 1: data.go.kr 수집 ---");

  const allMerchants: SangsaengMerchant[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const url = `${API_URL}?page=${page}&perPage=${perPage}&serviceKey=${encodeURIComponent(apiKey)}&returnType=JSON`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`API 오류: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const records = data.data || [];

    if (records.length === 0) break;

    for (const r of records) {
      if (r.업종명?.includes("주유") || r.업종명?.includes("오일뱅크")) {
        allMerchants.push({
          name: r.업체명,
          category: r.업종명,
          address: r.업체주소,
          dataDate: r.데이터기준일 || "",
        });
      }
    }

    console.log(
      `  페이지 ${page}: ${records.length}개 (주유소 누적: ${allMerchants.length}개)`
    );

    if (records.length < perPage) break;
    page++;
  }

  console.log(`  수집 완료: ${allMerchants.length}개\n`);
  return allMerchants;
}

/** Step 2: 같은 주소의 중복 항목 병합 */
function deduplicateByAddress(
  merchants: SangsaengMerchant[]
): SangsaengMerchant[] {
  const byAddress = new Map<string, SangsaengMerchant[]>();

  for (const m of merchants) {
    const key = normalizeAddress(m.address);
    const group = byAddress.get(key) || [];
    group.push(m);
    byAddress.set(key, group);
  }

  const result: SangsaengMerchant[] = [];

  for (const [, group] of byAddress) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    // 중복 중 가장 좋은 항목 선택:
    // 1. "주유소" 키워드가 이름에 포함된 항목 우선
    // 2. 브랜드 카테고리가 구체적인 항목 우선 (GS주유소 > 주유소)
    // 3. 이름이 더 긴 항목 (더 구체적)
    const sorted = [...group].sort((a, b) => {
      const aHasStation = a.name.includes("주유소") ? 1 : 0;
      const bHasStation = b.name.includes("주유소") ? 1 : 0;
      if (bHasStation !== aHasStation) return bHasStation - aHasStation;

      const aSpecific = a.category !== "주유소" ? 1 : 0;
      const bSpecific = b.category !== "주유소" ? 1 : 0;
      if (bSpecific !== aSpecific) return bSpecific - aSpecific;

      return b.name.length - a.name.length;
    });

    result.push(sorted[0]);
  }

  return result;
}

interface KakaoKeywordDoc {
  place_name: string;
  road_address_name: string;
  address_name: string;
  category_group_code: string;
  x: string;
  y: string;
}

/** 주소에서 도로명 추출 (e.g., "광주 광산구 동곡로 510" → "동곡로") */
function extractRoadName(addr: string): string | null {
  const match = addr.match(
    /(?:광주\s+(?:광산구|서구|북구|동구|남구)\s+)(\S+(?:로|길|대로))/
  );
  return match ? match[1] : null;
}

/** 주소에서 번지수 추출 */
function extractStreetNumber(addr: string): number | null {
  const match = addr.match(/(?:로|길|대로)\s+(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** 카카오 키워드 검색 */
async function kakaoSearch(
  kakaoKey: string,
  query: string
): Promise<KakaoKeywordDoc[]> {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=OL7&size=5`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${kakaoKey}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.documents || []).filter(
    (d: KakaoKeywordDoc) =>
      d.road_address_name?.includes("광주") ||
      d.address_name?.includes("광주")
  );
}

/** Step 3: 카카오맵 키워드 검색으로 상호명 + 주소 보완 */
async function enrichWithKakao(
  merchants: SangsaengMerchant[]
): Promise<SangsaengMerchant[]> {
  const kakaoKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoKey) {
    console.log("  KAKAO_REST_API_KEY 없음 — 보완 건너뜀\n");
    return merchants;
  }

  console.log(
    `--- Step 3: 카카오맵 상호명/주소 보완 (${merchants.length}개) ---`
  );

  let enriched = 0;
  let addressFixed = 0;
  let notFound = 0;

  for (let i = 0; i < merchants.length; i++) {
    const m = merchants[i];
    const district =
      m.address.match(/(광산구|서구|북구|동구|남구)/)?.[1] || "";
    const roadName = extractRoadName(m.address);

    let best: KakaoKeywordDoc | null = null;

    // 전략 1: "{이름} {구}" 검색 → 같은 도로의 결과 매칭
    const byName = await kakaoSearch(kakaoKey, `${m.name} ${district}`);
    if (roadName) {
      best =
        byName.find((d) => d.road_address_name.includes(roadName)) || null;
    }
    if (!best && byName.length === 1) {
      // 같은 구에서 1건만 나오면 신뢰
      best = byName[0];
    }

    // 전략 2: "{주소} 주유소" 검색 → 같은 도로의 결과 매칭
    if (!best && roadName) {
      await delay(100);
      const byAddr = await kakaoSearch(kakaoKey, `${m.address} 주유소`);
      best =
        byAddr.find((d) => d.road_address_name.includes(roadName)) || null;
    }

    // 번지수 차이가 너무 크면 다른 주유소로 판단
    if (best) {
      const origNum = extractStreetNumber(m.address);
      const bestNum = extractStreetNumber(best.road_address_name);
      if (origNum != null && bestNum != null && Math.abs(origNum - bestNum) > 50) {
        best = null; // 번지수 차이 >50이면 스킵
      }
    }

    if (best) {
      const oldName = m.name;
      const oldAddress = m.address;

      m.name = best.place_name;
      if (best.road_address_name) {
        m.address = best.road_address_name;
      }

      const nameChanged = oldName !== m.name;
      const addrChanged = oldAddress !== m.address;

      if (nameChanged || addrChanged) {
        enriched++;
        const changes: string[] = [];
        if (nameChanged) changes.push(`이름: ${oldName} → ${m.name}`);
        if (addrChanged) {
          changes.push(`주소: ${oldAddress} → ${m.address}`);
          addressFixed++;
        }
        console.log(
          `  [${i + 1}/${merchants.length}] ${changes.join(" | ")}`
        );
      }
    } else {
      notFound++;
      console.log(
        `  [${i + 1}/${merchants.length}] ✗ 매칭 실패: ${m.name} (${m.address})`
      );
    }

    await delay(150);
  }

  console.log(
    `\n  보완 완료: ${enriched}개 변경, ${addressFixed}개 주소 보완, ${notFound}개 미매칭\n`
  );
  return merchants;
}

export async function downloadAndParse(): Promise<SangsaengMerchant[]> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Step 1: 수집
  const raw = await fetchFromApi();

  // Step 2: 중복 제거
  console.log("--- Step 2: 중복 제거 ---");
  const deduped = deduplicateByAddress(raw);
  console.log(
    `  ${raw.length}개 → ${deduped.length}개 (${raw.length - deduped.length}개 제거)\n`
  );

  // Step 3: 카카오맵 보완
  const final = await enrichWithKakao(deduped);

  // 결과 출력
  console.log(`=== 최종 결과: ${final.length}개 주유소 ===`);
  final.slice(0, 5).forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.name} | ${m.category} | ${m.address}`);
  });

  // JSON으로 저장
  const outputPath = path.join(DATA_DIR, "sangsaeng-gas-stations.json");
  fs.writeFileSync(outputPath, JSON.stringify(final, null, 2), "utf-8");
  console.log(`\n결과 저장: ${outputPath}`);

  return final;
}

// 직접 실행 시만 (seed.ts에서 import할 때는 실행 안 됨)
if (require.main === module) {
  downloadAndParse().catch(console.error);
}
