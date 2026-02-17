import { NextRequest, NextResponse } from "next/server";
import { findStationById } from "@/lib/db/queries/stationQueries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const station = await findStationById(id);

    if (!station) {
      return NextResponse.json(
        { error: "주유소를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ station });
  } catch (error) {
    console.error("주유소 상세 조회 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
