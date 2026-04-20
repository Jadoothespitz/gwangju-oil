import { NextRequest, NextResponse } from "next/server";
import { isRateLimited, getClientIp } from "@/lib/api/rateLimit";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(`reverse-geocode:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  const params = request.nextUrl.searchParams;
  const lat = params.get("lat");
  const lng = params.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat, lng가 필요합니다." }, { status: 400 });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "서버 설정 오류." }, { status: 500 });
  }

  const url = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "주소를 찾을 수 없습니다." }, { status: 404 });
  }

  const data = await res.json();
  const doc = data.documents?.[0];
  if (!doc) {
    return NextResponse.json({ error: "주소를 찾을 수 없습니다." }, { status: 404 });
  }

  const address = doc.road_address?.address_name || doc.address?.address_name;
  return NextResponse.json({ address });
}
