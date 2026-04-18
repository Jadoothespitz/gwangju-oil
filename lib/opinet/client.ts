import type {
  OpinetAroundStation,
  OpinetAvgPrice,
  OpinetLowPriceStation,
  OpinetSigunguCode,
  OpinetStationDetail,
} from "./types";
import { GWANGJU_SIDO_CODE } from "./areaCode";

const BASE_URL = "https://www.opinet.co.kr/api";

function getApiKey(): string {
  const key = process.env.OPINET_API_KEY;
  if (!key) throw new Error("OPINET_API_KEY 환경 변수를 설정해주세요.");
  return key;
}

async function callOpinet<T>(
  endpoint: string,
  params: Record<string, string | number>
): Promise<T> {
  const searchParams = new URLSearchParams({
    code: getApiKey(),
    out: "json",
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
  });

  const url = `${BASE_URL}/${endpoint}?${searchParams.toString()}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

  if (!response.ok) {
    const body = await response.text().catch(() => "(body read failed)");
    throw new Error(`오피넷 HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  let data: unknown;
  const raw = await response.text();
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`오피넷 JSON 파싱 실패 (응답 미리보기): ${raw.slice(0, 300)}`);
  }

  const oil = (data as { RESULT?: { OIL?: T } })?.RESULT?.OIL;
  if (oil == null) {
    throw new Error(`오피넷 RESULT.OIL 없음: ${raw.slice(0, 300)}`);
  }
  return oil;
}

/** 시군구 코드 조회 */
export async function getSigunguCodes(): Promise<OpinetSigunguCode[]> {
  return callOpinet("sigunguCode.do", { sido: GWANGJU_SIDO_CODE });
}

/** 시도별 평균 유가 (무료 API) */
export async function getAvgSidoPrice(): Promise<OpinetAvgPrice[]> {
  return callOpinet("avgSidoPrice.do", {});
}

/** 시군구별 평균 유가 (무료 API) */
export async function getAvgSigunguPrice(
  sigungu: string,
  prodcd: string
): Promise<OpinetAvgPrice[]> {
  return callOpinet("avgSigunguPrice.do", {
    sido: GWANGJU_SIDO_CODE,
    sigungu,
    prodcd,
  });
}

/** 개별 주유소 상세 (유료 API) */
export async function getStationDetail(
  id: string
): Promise<OpinetStationDetail[]> {
  return callOpinet("detailById.do", { id });
}

/** 반경 내 주유소 검색 (유료 API) */
export async function getStationsAround(
  x: number,
  y: number,
  radius: number,
  prodcd: string,
  sort: 1 | 2 = 1
): Promise<OpinetAroundStation[]> {
  return callOpinet("aroundAll.do", { x, y, radius, prodcd, sort });
}

/** 지역 최저가 주유소 (유료 API) */
export async function getLowPriceStations(
  sigungu: string,
  prodcd: string,
  cnt: number = 100
): Promise<OpinetLowPriceStation[]> {
  return callOpinet("lowTop10.do", {
    sido: GWANGJU_SIDO_CODE,
    sigungu,
    prodcd,
    cnt,
  });
}
