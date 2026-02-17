import { NextRequest, NextResponse } from "next/server";
import { findStations } from "@/lib/db/queries/stationQueries";
import type { District, FuelType, SortBy } from "@/types";
import { DISTRICTS } from "@/types";
import { isRateLimited, getClientIp } from "@/lib/api/rateLimit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`stations:${ip}`, 60, 60_000)) {
      return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
    }
    const params = request.nextUrl.searchParams;

    const district = params.get("district") as District | null;
    const area = params.get("area");
    const dong = params.get("dong");
    const fuelType = (params.get("fuelType") || "gasoline") as FuelType;
    const sortBy = (params.get("sortBy") || "price") as SortBy;
    const page = Math.max(1, parseInt(params.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "50")));
    const lat = params.get("lat") ? parseFloat(params.get("lat")!) : undefined;
    const lng = params.get("lng") ? parseFloat(params.get("lng")!) : undefined;

    // 유효성 검사
    if (district && !DISTRICTS.includes(district)) {
      return NextResponse.json(
        { error: "유효하지 않은 구 이름입니다." },
        { status: 400 }
      );
    }

    if (!["gasoline", "diesel"].includes(fuelType)) {
      return NextResponse.json(
        { error: "fuelType은 gasoline 또는 diesel이어야 합니다." },
        { status: 400 }
      );
    }

    const { stations, total } = await findStations({
      district: district || undefined,
      area: area || undefined,
      dong: dong || undefined,
      fuelType,
      sortBy,
      lat,
      lng,
      page,
      limit,
    });

    return NextResponse.json({ stations, total, page, limit });
  } catch (error) {
    console.error("주유소 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
