import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  return NextResponse.json({
    hasKey: !!key,
    keyLength: key?.length ?? 0,
    keyPrefix: key ? key.substring(0, 4) + "..." : "(empty)",
    // 다른 env vars 확인
    hasMongoDB: !!process.env.MONGODB_URI,
    hasOpinet: !!process.env.OPINET_API_KEY,
  });
}
