import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getReportsCollection } from "@/lib/db/models/Report";
import { getStationsCollection } from "@/lib/db/models/Station";
import type { ReportType } from "@/types";

function checkAuth(request: NextRequest) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await params;
  if (!ObjectId.isValid(reportId)) {
    return NextResponse.json({ error: "올바르지 않은 ID입니다." }, { status: 400 });
  }

  const reports = await getReportsCollection();
  const report = await reports.findOne({ _id: new ObjectId(reportId) });
  if (!report) {
    return NextResponse.json({ error: "제보를 찾을 수 없습니다." }, { status: 404 });
  }
  if (report.status !== "pending") {
    return NextResponse.json({ error: "이미 처리된 제보입니다." }, { status: 409 });
  }

  // 제보 유형에 따라 stations DB 반영
  const stations = await getStationsCollection();
  const type: ReportType = report.type;

  if (type === "closed") {
    await stations.updateOne(
      { uni_id: report.station_uni_id },
      { $set: { isActive: false, updatedAt: new Date().toISOString() } }
    );
  } else if (type === "no_card") {
    await stations.updateOne(
      { uni_id: report.station_uni_id },
      { $set: { "sangsaeng.matched": false, updatedAt: new Date().toISOString() } }
    );
  }

  await reports.updateOne(
    { _id: new ObjectId(reportId) },
    { $set: { status: "approved", reviewedAt: new Date().toISOString() } }
  );

  return NextResponse.json({ ok: true, type, station_uni_id: report.station_uni_id });
}
