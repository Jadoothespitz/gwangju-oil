import { NextRequest, NextResponse } from "next/server";
import { isRateLimited, getClientIp } from "@/lib/api/rateLimit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`geocode:${ip}`, 30, 60_000)) {
      return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
    }
    const address = request.nextUrl.searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "address 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.KAKAO_REST_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "카카오 REST API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 주소 검색 시도, 결과 없으면 키워드 검색으로 폴백
    const tryFetch = async (endpoint: string) => {
      const url = `https://dapi.kakao.com/v2/local/${endpoint}?query=${encodeURIComponent(address)}`;
      const res = await fetch(url, { headers: { Authorization: `KakaoAK ${apiKey}` } });
      if (!res.ok) throw new Error(`카카오 API 오류: ${res.status}`);
      const data = await res.json();
      return data.documents?.[0] ?? null;
    };

    let result = await tryFetch("search/address.json");
    if (!result) result = await tryFetch("search/keyword.json");

    if (!result) {
      return NextResponse.json(
        { error: "주소를 찾을 수 없습니다.", lat: null, lng: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      lat: parseFloat(result.y),
      lng: parseFloat(result.x),
      address: result.address_name,
    });
  } catch (error) {
    console.error("지오코딩 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
