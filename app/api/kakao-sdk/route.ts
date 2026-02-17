import { NextResponse } from "next/server";

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY!;
const KAKAO_SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=services`;

let cachedSdk: string | null = null;
let cacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1시간

function patchSdk(raw: string): string {
  // SDK는 자기 <script> 태그의 src URL에서 appkey, libraries, autoload을 파싱함
  // 프록시로 로드하면 src가 "/api/kakao-sdk"라 매치 안 됨 → r="" → 파라미터 없음
  // 해결: for 루프 전체를 단순 변수 선언으로 교체하여 r에 원본 URL을 직접 주입
  return raw.replace(
    /for\(var i,s="https:"==location\.protocol\?"https:":"http:",r="",d=document\.getElementsByTagName\("script"\)[\s\S]*?break\}d=null/,
    `var i,s="https:"==location.protocol?"https:":"http:",r="${KAKAO_SDK_URL}"`
  );
}

export async function GET() {
  const now = Date.now();

  if (cachedSdk && now - cacheTime < CACHE_DURATION) {
    return new NextResponse(cachedSdk, {
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  const res = await fetch(KAKAO_SDK_URL);
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch Kakao SDK" },
      { status: 502 }
    );
  }

  const raw = await res.text();
  cachedSdk = patchSdk(raw);
  cacheTime = now;

  return new NextResponse(cachedSdk, {
    headers: { "Content-Type": "application/javascript; charset=utf-8" },
  });
}
