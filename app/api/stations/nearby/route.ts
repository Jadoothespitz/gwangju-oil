import { NextRequest, NextResponse } from "next/server";
import { findNearbyStations } from "@/lib/db/queries/stationQueries";
import type { FuelType, SortBy } from "@/types";
import { isRateLimited, getClientIp } from "@/lib/api/rateLimit";

const VALID_RADII = [1000, 3000, 5000, 10000];

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`nearby:${ip}`, 60, 60_000)) {
      return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
    }
    const params = request.nextUrl.searchParams;

    const lat = parseFloat(params.get("lat") || "");
    const lng = parseFloat(params.get("lng") || "");
    const radius = parseInt(params.get("radius") || "3000");
    const fuelType = (params.get("fuelType") || "gasoline") as FuelType;
    const sortBy = (params.get("sortBy") || "distance") as SortBy;
    const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "50")));

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "lat, lng 좌표가 필요합니다." },
        { status: 400 }
      );
    }

    // 광주광역시 범위 대략 확인
    if (lat < 34.9 || lat > 35.4 || lng < 126.5 || lng > 127.2) {
      return NextResponse.json(
        { error: "광주광역시 범위를 벗어난 좌표입니다." },
        { status: 400 }
      );
    }

    const stations = await findNearbyStations({
      lat,
      lng,
      radius: Math.min(radius, 15000),
      fuelType,
      sortBy,
      limit,
    });

    return NextResponse.json({ stations });
  } catch (error) {
    console.error("주변 주유소 조회 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
