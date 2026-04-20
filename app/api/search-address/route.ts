import { NextRequest, NextResponse } from "next/server";
import { isRateLimited, getClientIp } from "@/lib/api/rateLimit";

// 광주광역시 + 전라남도 bounding box (minLng,minLat,maxLng,maxLat)
const REGION_RECT = "125.9,33.9,127.9,35.4";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(`search-address:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  const query = request.nextUrl.searchParams.get("query");
  if (!query || query.trim().length < 1) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "서버 설정 오류." }, { status: 500 });
  }

  const headers = { Authorization: `KakaoAK ${apiKey}` };

  const [keywordRes, addressRes] = await Promise.all([
    fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&rect=${REGION_RECT}&size=5`,
      { headers }
    ),
    fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=3`,
      { headers }
    ),
  ]);

  const [keywordData, addressData] = await Promise.all([
    keywordRes.ok ? keywordRes.json() : { documents: [] },
    addressRes.ok ? addressRes.json() : { documents: [] },
  ]);

  type KakaoKeywordDoc = {
    id: string;
    place_name: string;
    road_address_name: string;
    address_name: string;
    x: string;
    y: string;
  };
  type KakaoAddressDoc = {
    address_name: string;
    x: string;
    y: string;
    road_address?: { address_name: string } | null;
  };

  const seen = new Set<string>();

  const keywordResults = (keywordData.documents as KakaoKeywordDoc[]).map((d) => ({
    id: `kw-${d.id}`,
    name: d.place_name,
    address: d.road_address_name || d.address_name,
    lat: parseFloat(d.y),
    lng: parseFloat(d.x),
  }));

  // 주소 검색 결과 중 전남+광주 범위 내 것만 포함
  const addressResults = (addressData.documents as KakaoAddressDoc[])
    .filter((d) => {
      const lat = parseFloat(d.y);
      const lng = parseFloat(d.x);
      return lat >= 33.9 && lat <= 35.4 && lng >= 125.9 && lng <= 127.9;
    })
    .map((d) => ({
      id: `addr-${d.address_name}`,
      name: d.road_address?.address_name || d.address_name,
      address: d.address_name,
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
    }));

  const results = [...keywordResults, ...addressResults].filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return NextResponse.json({ results: results.slice(0, 6) });
}
