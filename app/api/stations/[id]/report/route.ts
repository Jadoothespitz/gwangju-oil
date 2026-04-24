import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getReportsCollection, ensureReportIndexes } from "@/lib/db/models/Report";
import { getStationsCollection } from "@/lib/db/models/Station";
import { isRateLimited, getClientIp } from "@/lib/api/rateLimit";
import type { ReportType } from "@/types";

const VALID_TYPES: ReportType[] = ["closed", "no_card", "other"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    // 제보 전용 리밋: 1시간에 10회
    if (isRateLimited(`report:${ip}`, 10, 60 * 60 * 1_000)) {
      return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
    }

    const { id: uni_id } = await params;
    const body = await request.json().catch(() => ({}));
    const type: ReportType = body.type;
    const comment: string | undefined = body.comment;

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "올바르지 않은 제보 유형입니다." }, { status: 400 });
    }
    if (comment && comment.length > 200) {
      return NextResponse.json({ error: "코멘트는 200자 이내로 작성해주세요." }, { status: 400 });
    }

    // 주유소 존재 확인
    const stations = await getStationsCollection();
    const station = await stations.findOne({ uni_id, isActive: true });
    if (!station) {
      return NextResponse.json({ error: "주유소를 찾을 수 없습니다." }, { status: 404 });
    }

    const ipHash = createHash("sha256").update(ip).digest("hex");

    // 동일 IP + 동일 주유소 24시간 내 중복 제보 차단
    const reports = await getReportsCollection();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1_000);
    const duplicate = await reports.findOne({
      ipHash,
      station_uni_id: uni_id,
      createdAt: { $gte: oneDayAgo.toISOString() },
    });
    if (duplicate) {
      return NextResponse.json({ error: "이미 이 주유소에 대해 제보하셨습니다. 24시간 후 다시 시도해주세요." }, { status: 429 });
    }

    // 텍스트 sanitize: HTML 태그 제거
    const safeComment = comment
      ? comment.replace(/<[^>]*>/g, "").trim().slice(0, 200)
      : undefined;

    await ensureReportIndexes();
    await reports.insertOne({
      station_uni_id: uni_id,
      station_name: station.name,
      type,
      ...(safeComment ? { comment: safeComment } : {}),
      ipHash,
      userAgent: request.headers.get("user-agent")?.slice(0, 200) ?? "",
      createdAt: new Date().toISOString(),
      status: "pending",
    });

    // Telegram 알림
    await notifyTelegram(station.name, uni_id, type, safeComment);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("report POST error:", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

async function notifyTelegram(
  stationName: string,
  uniId: string,
  type: ReportType,
  comment?: string
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const typeLabel: Record<ReportType, string> = {
    closed: "폐업",
    no_card: "상생카드 미가맹",
    other: "기타",
  };

  const text = [
    `📢 <b>사용자 제보</b>`,
    `주유소: <b>${stationName}</b> (<code>${uniId}</code>)`,
    `유형: ${typeLabel[type]}`,
    comment ? `내용: ${comment}` : null,
    `\n처리: <code>/inactive ${uniId}</code>`,
  ]
    .filter(Boolean)
    .join("\n");

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch(() => {});
}
