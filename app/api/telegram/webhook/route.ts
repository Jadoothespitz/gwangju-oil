import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";

async function sendTelegram(chatId: number | string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId: number = message.chat?.id;
    const allowedChatId = Number(process.env.TELEGRAM_CHAT_ID);

    // 허용된 chat_id만 처리
    if (chatId !== allowedChatId) {
      return NextResponse.json({ ok: true });
    }

    const text: string = message.text ?? "";

    // /inactive {opinet_id} — 폐업 처리
    const inactiveMatch = text.match(/^\/inactive\s+(\S{1,20})/i);
    if (inactiveMatch) {
      const opinetId = inactiveMatch[1].trim();
      const db = await getDb();
      const col = db.collection("stations");

      const station = await col.findOne({
        $or: [{ opinet_id: opinetId }, { uni_id: opinetId }],
      });

      if (!station) {
        await sendTelegram(chatId, `❌ <code>${opinetId}</code> — 주유소를 찾을 수 없습니다.`);
        return NextResponse.json({ ok: true });
      }

      if (!station.isActive) {
        await sendTelegram(chatId, `ℹ️ <b>${station.name}</b> — 이미 비활성 상태입니다.`);
        return NextResponse.json({ ok: true });
      }

      await col.updateOne({ _id: station._id }, { $set: { isActive: false } });
      await sendTelegram(
        chatId,
        `✅ <b>${station.name}</b> (${opinetId}) 폐업 처리 완료\nisActive → false`
      );
      return NextResponse.json({ ok: true });
    }

    // /reports — 미처리 제보 목록
    if (text.trim() === "/reports") {
      const db = await getDb();
      const pending = await db
        .collection("reports")
        .find({ status: "pending" })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      if (pending.length === 0) {
        await sendTelegram(chatId, "✅ 미처리 제보 없음");
      } else {
        const typeLabel: Record<string, string> = {
          closed: "폐업",
          no_card: "상생카드 미가맹",
          wrong_price: "가격 오류",
          other: "기타",
        }; // wrong_price kept for legacy reports
        const lines = pending.map(
          (r) =>
            `• <b>${r.station_name}</b> — ${typeLabel[r.type] ?? r.type}` +
            (r.comment ? `\n  "${r.comment}"` : "") +
            `\n  승인: <code>/approve ${r._id}</code>`
        );
        await sendTelegram(
          chatId,
          `📋 <b>미처리 제보 ${pending.length}건</b>\n\n${lines.join("\n\n")}`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // /approve {reportId} — 제보 승인 + DB 반영
    const approveMatch = text.match(/^\/approve\s+([a-f0-9]{24})/i);
    if (approveMatch) {
      const reportId = approveMatch[1];
      const db = await getDb();
      const report = await db.collection("reports").findOne({ _id: new ObjectId(reportId) });

      if (!report) {
        await sendTelegram(chatId, `❌ 제보를 찾을 수 없습니다: <code>${reportId}</code>`);
        return NextResponse.json({ ok: true });
      }
      if (report.status !== "pending") {
        await sendTelegram(chatId, `ℹ️ 이미 처리된 제보입니다 (${report.status})`);
        return NextResponse.json({ ok: true });
      }

      if (report.type === "closed") {
        await db.collection("stations").updateOne(
          { uni_id: report.station_uni_id },
          { $set: { isActive: false, updatedAt: new Date().toISOString() } }
        );
      } else if (report.type === "no_card") {
        await db.collection("stations").updateOne(
          { uni_id: report.station_uni_id },
          { $set: { "sangsaeng.matched": false, updatedAt: new Date().toISOString() } }
        );
      }

      await db.collection("reports").updateOne(
        { _id: new ObjectId(reportId) },
        { $set: { status: "approved", reviewedAt: new Date().toISOString() } }
      );

      const typeLabel: Record<string, string> = { closed: "폐업", no_card: "상생카드 미가맹", wrong_price: "가격 오류", other: "기타" };
      await sendTelegram(
        chatId,
        `✅ <b>${report.station_name}</b> 제보 승인 완료\n유형: ${typeLabel[report.type] ?? report.type}`
      );
      return NextResponse.json({ ok: true });
    }

    // /notice {uni_id} {text} — 운영자 공지 설정
    const noticeMatch = text.match(/^\/notice\s+(\S+)\s+([\s\S]{1,100})/i);
    if (noticeMatch) {
      const uniId = noticeMatch[1].trim();
      const noticeText = noticeMatch[2].trim();
      const db = await getDb();
      const result = await db.collection("stations").updateOne(
        { uni_id: uniId },
        { $set: { notice: noticeText, updatedAt: new Date().toISOString() } }
      );
      if (result.matchedCount === 0) {
        await sendTelegram(chatId, `❌ <code>${uniId}</code> — 주유소를 찾을 수 없습니다.`);
      } else {
        await sendTelegram(chatId, `✅ 공지 설정 완료\n<b>${uniId}</b>: "${noticeText}"`);
      }
      return NextResponse.json({ ok: true });
    }

    // /clearnotice {uni_id} — 운영자 공지 삭제
    const clearNoticeMatch = text.match(/^\/clearnotice\s+(\S+)/i);
    if (clearNoticeMatch) {
      const uniId = clearNoticeMatch[1].trim();
      const db = await getDb();
      const result = await db.collection("stations").updateOne(
        { uni_id: uniId },
        { $unset: { notice: "" }, $set: { updatedAt: new Date().toISOString() } }
      );
      if (result.matchedCount === 0) {
        await sendTelegram(chatId, `❌ <code>${uniId}</code> — 주유소를 찾을 수 없습니다.`);
      } else {
        await sendTelegram(chatId, `✅ <b>${uniId}</b> 공지 삭제 완료`);
      }
      return NextResponse.json({ ok: true });
    }

    // /status — 미갱신 주유소 현황
    if (text.trim() === "/status") {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const db = await getDb();
      const stale = await db
        .collection("stations")
        .find({
          isActive: true,
          opinet_id: { $exists: true, $ne: null },
          $or: [
            { "prices.updatedAt": { $lt: twoDaysAgo } },
            { "prices.updatedAt": { $exists: false } },
          ],
        })
        .toArray();

      if (stale.length === 0) {
        await sendTelegram(chatId, "✅ 2일 이상 미갱신 주유소 없음");
      } else {
        const lines = stale.map(
          (s) => `• <b>${s.name}</b> (${s.opinet_id ?? s.uni_id}) — 마지막: ${s.prices?.updatedAt?.slice(0, 10) ?? "없음"}`
        );
        await sendTelegram(
          chatId,
          `⚠️ <b>미갱신 주유소 ${stale.length}개</b>\n\n${lines.join("\n")}\n\n폐업 처리: <code>/inactive {opinet_id}</code>`
        );
      }
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    console.error("Telegram webhook error:", e);
  }

  return NextResponse.json({ ok: true });
}
