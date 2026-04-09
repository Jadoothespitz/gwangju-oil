import { NextRequest, NextResponse } from "next/server";
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
    const inactiveMatch = text.match(/^\/inactive\s+(\S+)/i);
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
