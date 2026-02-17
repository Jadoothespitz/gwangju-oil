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
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`오피넷 API 오류: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.RESULT.OIL;
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
