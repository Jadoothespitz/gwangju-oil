import { NextRequest, NextResponse } from "next/server";
import { isRateLimited, getClientIp } from "@/lib/api/rateLimit";
import { findStations } from "@/lib/db/queries/stationQueries";

// 가격 기준 상위 N개에만 Directions API 호출 (무료 한도 보호)
const LAB_TOP_N = 35;

async function fetchRouteDistance(
  apiKey: string,
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number
): Promise<number | null> {
  try {
    const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${originLng},${originLat}&destination=${destLng},${destLat}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route || route.result_code !== 0) return null;
    return route.summary?.distance ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(`lab:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const params = request.nextUrl.searchParams;
  const lat = parseFloat(params.get("lat") || "");
  const lng = parseFloat(params.get("lng") || "");
  const efficiency = parseFloat(params.get("efficiency") || "");
  const budget = parseInt(params.get("budget") || "");
  const tripType = params.get("tripType") === "one-way" ? "one-way" : "round-trip";
  const fuelType = params.get("fuelType") === "diesel" ? "diesel" : "gasoline";

  if ([lat, lng, efficiency, budget].some(isNaN)) {
    return NextResponse.json({ error: "필수 파라미터가 누락됐습니다." }, { status: 400 });
  }
  if (efficiency <= 0 || budget <= 0) {
    return NextResponse.json(
      { error: "연비와 주유 금액은 0보다 커야 합니다." },
      { status: 400 }
    );
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "서버 설정 오류가 발생했습니다." }, { status: 500 });
  }

  let stationData;
  try {
    // null 가격 주유소가 정렬 시 앞에 올 수 있으므로 여유분 포함해 조회
    stationData = await findStations({
      fuelType,
      sortBy: "price",
      page: 1,
      limit: LAB_TOP_N + 20,
    });
  } catch {
    return NextResponse.json(
      { error: "주유소 정보를 불러오지 못했습니다." },
      { status: 503 }
    );
  }

  const candidates = stationData.stations
    .filter((s) => s.prices[fuelType] != null && s.prices[fuelType]! > 0)
    .slice(0, LAB_TOP_N);

  const distances = await Promise.all(
    candidates.map((s) => {
      const [sLng, sLat] = s.location.coordinates;
      return fetchRouteDistance(apiKey, lng, lat, sLng, sLat);
    })
  );

  if (distances.every((d) => d === null)) {
    return NextResponse.json(
      { error: "경로 계산 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 }
    );
  }

  const results = candidates
    .map((station, i) => {
      const distanceM = distances[i];
      if (distanceM == null) return null;
      const pricePerL = station.prices[fuelType]!;
      const travelKm = tripType === "one-way" ? distanceM / 1000 : (distanceM / 1000) * 2;
      const totalFuelL = budget / pricePerL;
      const travelFuelL = travelKm / efficiency;
      const netFuelL = totalFuelL - travelFuelL;
      return { station, distanceM, travelKm, tripType, fuelType, pricePerL, totalFuelL, travelFuelL, netFuelL };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.netFuelL - a.netFuelL);

  return NextResponse.json({ results });
}
