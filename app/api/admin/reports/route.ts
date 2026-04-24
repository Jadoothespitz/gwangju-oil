import { NextRequest, NextResponse } from "next/server";
import { getReportsCollection } from "@/lib/db/models/Report";

function checkAuth(request: NextRequest) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? "pending";
  const limit = Math.min(100, parseInt(params.get("limit") ?? "50"));

  const col = await getReportsCollection();
  const reports = await col
    .find({ status })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return NextResponse.json({ reports });
}
