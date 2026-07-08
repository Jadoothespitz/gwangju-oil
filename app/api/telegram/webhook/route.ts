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

    // /help — 사용 가능한 명령어 목록 (새 명령어 추가 시 이 목록도 함께 갱신할 것)
    if (text.trim() === "/help") {
      const helpText = [
        `🤖 <b>사용 가능한 명령어</b>`,
        ``,
        `<b>주유소 상태</b>`,
        `/inactive {코드} — 폐업 확정 처리`,
        `/pause {코드} — 일시 중지 (사이트에서만 숨김, 되돌릴 수 있음)`,
        `/resume {코드} — 일시 중지 해제`,
        `/paused — 현재 일시 중지된 주유소 목록`,
        ``,
        `<b>공지</b>`,
        `/notice {코드} {내용} — 운영자 공지 설정`,
        `/clearnotice {코드} — 운영자 공지 삭제`,
        ``,
        `<b>제보</b>`,
        `/reports — 미처리 제보 목록`,
        `/approve {제보ID} — 제보 승인`,
        ``,
        `<b>현황</b>`,
        `/status — 2일 이상 가격 미갱신 주유소 목록`,
        ``,
        `※ {코드}는 opinet_id·uni_id 둘 다 가능`,
      ].join("\n");
      await sendTelegram(chatId, helpText);
      return NextResponse.json({ ok: true });
    }

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

      await col.updateOne(
        { _id: station._id },
        { $set: { isActive: false }, $unset: { paused: "", pausedAt: "" } }
      );
      await sendTelegram(
        chatId,
        `✅ <b>${station.name}</b> (${opinetId}) 폐업 처리 완료\nisActive → false`
      );
      return NextResponse.json({ ok: true });
    }

    // /pause {opinet_id|uni_id} — 일시 중지 (폐업 여부 불확실, 사이트 노출만 숨김)
    const pauseMatch = text.match(/^\/pause\s+(\S{1,20})/i);
    if (pauseMatch) {
      const code = pauseMatch[1].trim();
      const db = await getDb();
      const col = db.collection("stations");

      const station = await col.findOne({
        $or: [{ opinet_id: code }, { uni_id: code }],
      });

      if (!station) {
        await sendTelegram(chatId, `❌ <code>${code}</code> — 주유소를 찾을 수 없습니다.`);
        return NextResponse.json({ ok: true });
      }

      if (station.paused) {
        await sendTelegram(chatId, `ℹ️ <b>${station.name}</b> — 이미 일시 중지 상태입니다.`);
        return NextResponse.json({ ok: true });
      }

      const now = new Date().toISOString();
      await col.updateOne(
        { _id: station._id },
        { $set: { paused: true, pausedAt: now, updatedAt: now } }
      );
      await sendTelegram(
        chatId,
        `⏸️ <b>${station.name}</b> (${code}) 일시 중지 완료\n사이트 목록에서 숨김 처리됨. 재개: <code>/resume ${code}</code>`
      );
      return NextResponse.json({ ok: true });
    }

    // /resume {opinet_id|uni_id} — 일시 중지 해제
    const resumeMatch = text.match(/^\/resume\s+(\S{1,20})/i);
    if (resumeMatch) {
      const code = resumeMatch[1].trim();
      const db = await getDb();
      const col = db.collection("stations");

      const station = await col.findOne({
        $or: [{ opinet_id: code }, { uni_id: code }],
      });

      if (!station) {
        await sendTelegram(chatId, `❌ <code>${code}</code> — 주유소를 찾을 수 없습니다.`);
        return NextResponse.json({ ok: true });
      }

      if (!station.paused) {
        await sendTelegram(chatId, `ℹ️ <b>${station.name}</b> — 일시 중지 상태가 아닙니다.`);
        return NextResponse.json({ ok: true });
      }

      await col.updateOne(
        { _id: station._id },
        { $unset: { paused: "", pausedAt: "" }, $set: { updatedAt: new Date().toISOString() } }
      );
      await sendTelegram(chatId, `▶️ <b>${station.name}</b> (${code}) 재개 완료\n사이트 목록에 다시 노출됨`);
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
          {
            $set: { isActive: false, updatedAt: new Date().toISOString() },
            $unset: { paused: "", pausedAt: "" },
          }
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

    // /notice {opinet_id|uni_id} {text} — 운영자 공지 설정
    const noticeMatch = text.match(/^\/notice\s+(\S+)\s+([\s\S]{1,100})/i);
    if (noticeMatch) {
      const stationCode = noticeMatch[1].trim();
      const noticeText = noticeMatch[2].trim();
      const db = await getDb();
      const result = await db.collection("stations").updateOne(
        { $or: [{ opinet_id: stationCode }, { uni_id: stationCode }] },
        { $set: { notice: noticeText, updatedAt: new Date().toISOString() } }
      );
      if (result.matchedCount === 0) {
        await sendTelegram(chatId, `❌ <code>${stationCode}</code> — 주유소를 찾을 수 없습니다.`);
      } else {
        await sendTelegram(chatId, `✅ 공지 설정 완료\n<b>${stationCode}</b>: "${noticeText}"`);
      }
      return NextResponse.json({ ok: true });
    }

    // /clearnotice {opinet_id|uni_id} — 운영자 공지 삭제
    const clearNoticeMatch = text.match(/^\/clearnotice\s+(\S+)/i);
    if (clearNoticeMatch) {
      const stationCode = clearNoticeMatch[1].trim();
      const db = await getDb();
      const result = await db.collection("stations").updateOne(
        { $or: [{ opinet_id: stationCode }, { uni_id: stationCode }] },
        { $unset: { notice: "" }, $set: { updatedAt: new Date().toISOString() } }
      );
      if (result.matchedCount === 0) {
        await sendTelegram(chatId, `❌ <code>${stationCode}</code> — 주유소를 찾을 수 없습니다.`);
      } else {
        await sendTelegram(chatId, `✅ <b>${stationCode}</b> 공지 삭제 완료`);
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
          paused: { $ne: true },
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
          `⚠️ <b>미갱신 주유소 ${stale.length}개</b>\n\n${lines.join("\n")}\n\n폐업 처리: <code>/inactive {opinet_id}</code>\n확실하지 않으면: <code>/pause {opinet_id}</code>`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // /paused — 일시 중지된 주유소 현황
    if (text.trim() === "/paused") {
      const db = await getDb();
      const paused = await db.collection("stations").find({ paused: true }).toArray();

      if (paused.length === 0) {
        await sendTelegram(chatId, "✅ 일시 중지된 주유소 없음");
      } else {
        const now = Date.now();
        const lines = paused.map((s) => {
          const days = s.pausedAt
            ? Math.floor((now - new Date(s.pausedAt).getTime()) / 86400000)
            : null;
          return `• <b>${s.name}</b> (${s.opinet_id ?? s.uni_id}) — ${days != null ? `${days}일째 중지` : "중지 시점 불명"}`;
        });
        await sendTelegram(
          chatId,
          `⏸️ <b>일시 중지 주유소 ${paused.length}개</b>\n\n${lines.join("\n")}\n\n재개: <code>/resume {code}</code> · 폐업 확정: <code>/inactive {code}</code>`
        );
      }
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    console.error("Telegram webhook error:", e);
  }

  return NextResponse.json({ ok: true });
}
