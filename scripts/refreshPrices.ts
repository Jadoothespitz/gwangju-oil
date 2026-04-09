/**
 * 주유소 가격 갱신
 *
 * 사용법: npm run prices:refresh
 *
 * aroundAll.do로 광주 전체 주유소 가격을 일괄 수집 후
 * opinet_id가 매칭된 주유소의 가격을 업데이트합니다.
 */
import * as dns from "dns";
import * as path from "path";
import { appendFileSync } from "fs";
import { config } from "dotenv";
import { MongoClient } from "mongodb";
import { wgs84ToKatec } from "../lib/geo/coordinateConverter";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
config({ path: path.join(__dirname, "..", ".env.local") });

const API_KEY = process.env.OPINET_API_KEY!;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("Telegram 알림 실패:", e);
  }
}

const GWANGJU_CENTERS = [
  { name: "광산구 중심", lat: 35.1397, lng: 126.7930 },
  { name: "광산구 남부", lat: 35.1100, lng: 126.7930 },
  { name: "광산구 북서부", lat: 35.1800, lng: 126.7700 },
  { name: "서구", lat: 35.1487, lng: 126.8560 },
  { name: "북구 중심", lat: 35.1740, lng: 126.9120 },
  { name: "북구 북부", lat: 35.2100, lng: 126.8900 },
  { name: "동구", lat: 35.1460, lng: 126.9230 },
  { name: "남구 중심", lat: 35.1330, lng: 126.9020 },
  { name: "남구 남부", lat: 35.1050, lng: 126.8800 },
];
const SEARCH_RADIUS = 8000;

async function refreshPrices() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI 환경 변수를 설정해주세요.");
    process.exit(1);
  }
  if (!API_KEY) {
    console.error("OPINET_API_KEY 환경 변수를 설정해주세요.");
    process.exit(1);
  }

  // aroundAll.do로 가격 수집 (휘발유 + 경유)
  console.log("오피넷 가격 수집 중...");

  const gasolinePrices = new Map<string, number>();
  const dieselPrices = new Map<string, number>();

  for (const center of GWANGJU_CENTERS) {
    const katec = wgs84ToKatec(center.lng, center.lat);

    // 휘발유
    const gasUrl = `https://www.opinet.co.kr/api/aroundAll.do?code=${API_KEY}&out=json&x=${Math.round(katec.x)}&y=${Math.round(katec.y)}&radius=${SEARCH_RADIUS}&prodcd=B027&sort=1`;
    const gasRes = await fetch(gasUrl);
    const gasData = await gasRes.json();
    for (const s of gasData.RESULT?.OIL || []) {
      gasolinePrices.set(s.UNI_ID, s.PRICE);
    }
    await delay(300);

    // 경유
    const dslUrl = `https://www.opinet.co.kr/api/aroundAll.do?code=${API_KEY}&out=json&x=${Math.round(katec.x)}&y=${Math.round(katec.y)}&radius=${SEARCH_RADIUS}&prodcd=D047&sort=1`;
    const dslRes = await fetch(dslUrl);
    const dslData = await dslRes.json();
    for (const s of dslData.RESULT?.OIL || []) {
      dieselPrices.set(s.UNI_ID, s.PRICE);
    }
    await delay(300);
  }

  console.log(`  휘발유 가격: ${gasolinePrices.size}개, 경유 가격: ${dieselPrices.size}개`);

  // DB 업데이트
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db("gwangju-oil");
    const collection = db.collection("stations");

    const stations = await collection
      .find(
        { isActive: true, opinet_id: { $exists: true, $ne: null } },
        { projection: { opinet_id: 1, name: 1, prices: 1 } }
      )
      .toArray();

    console.log(`${stations.length}개 주유소 가격 갱신 시작...`);

    // Fallback: aroundAll에 없는 주유소는 detailById로 직접 조회
    const missingIds = stations
      .map((s) => s.opinet_id)
      .filter((id) => !gasolinePrices.has(id) && !dieselPrices.has(id));

    if (missingIds.length > 0) {
      console.log(`  aroundAll 미수집 ${missingIds.length}개 → detailById 직접 조회`);
      for (const id of missingIds) {
        try {
          const res = await fetch(
            `https://www.opinet.co.kr/api/detailById.do?code=${API_KEY}&out=json&id=${id}`
          );
          const data = await res.json();
          const detail = data.RESULT?.OIL?.[0];
          if (detail?.OIL_PRICE) {
            for (const p of detail.OIL_PRICE) {
              if (p.PRODCD === "B027" && p.PRICE) gasolinePrices.set(id, p.PRICE);
              if (p.PRODCD === "D047" && p.PRICE) dieselPrices.set(id, p.PRICE);
            }
          }
        } catch {
          // skip
        }
        await delay(100);
      }
    }

    let updated = 0;
    const notUpdated: string[] = [];
    const now = new Date().toISOString();

    type ReportRow = {
      name: string;
      gasOld: number | null;
      gasNew: number | null;
      gasDelta: number | null;
      dslOld: number | null;
      dslNew: number | null;
      dslDelta: number | null;
      failed: boolean;
    };
    const report: ReportRow[] = [];

    for (const station of stations) {
      const gasPrice = gasolinePrices.get(station.opinet_id) ?? null;
      const dslPrice = dieselPrices.get(station.opinet_id) ?? null;
      const gasOld: number | null = station.prices?.gasoline ?? null;
      const dslOld: number | null = station.prices?.diesel ?? null;

      if (gasPrice != null || dslPrice != null) {
        await collection.updateOne(
          { _id: station._id },
          {
            $set: {
              ...(gasPrice != null && { "prices.gasoline": gasPrice }),
              ...(dslPrice != null && { "prices.diesel": dslPrice }),
              "prices.updatedAt": now,
              lastSyncedAt: now,
            },
          }
        );
        updated++;
        report.push({
          name: station.name,
          gasOld,
          gasNew: gasPrice,
          gasDelta: gasPrice != null && gasOld != null ? gasPrice - gasOld : null,
          dslOld,
          dslNew: dslPrice,
          dslDelta: dslPrice != null && dslOld != null ? dslPrice - dslOld : null,
          failed: false,
        });
      } else {
        notUpdated.push(`${station.name} (${station.opinet_id})`);
        report.push({
          name: station.name,
          gasOld,
          gasNew: null,
          gasDelta: null,
          dslOld,
          dslNew: null,
          dslDelta: null,
          failed: true,
        });
      }
    }

    console.log(`\n가격 갱신 완료: ${updated}개 성공, ${notUpdated.length}개 실패`);

    // GitHub Step Summary 또는 콘솔에 리포트 출력
    const changedCount = report.filter(
      (r) => !r.failed && ((r.gasDelta != null && r.gasDelta !== 0) || (r.dslDelta != null && r.dslDelta !== 0))
    ).length;

    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 16);

    const fmt = (v: number | null) =>
      v != null ? v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "-";
    const fmtDelta = (d: number | null) => {
      if (d == null) return "-";
      if (d === 0) return "0";
      return d > 0 ? `+${d}` : `${d}`;
    };

    const lines: string[] = [];
    lines.push(`## ⛽ 유가 갱신 리포트`);
    lines.push(`**${kst} KST** | 총 ${stations.length}개 중 **${updated}개 성공**, ${notUpdated.length}개 실패, 가격 변동 ${changedCount}건`);
    lines.push("");
    lines.push("| 주유소 | 휘발유(전) | 휘발유(후) | 변동 | 경유(전) | 경유(후) | 변동 |");
    lines.push("|--------|-----------|-----------|:----:|---------|---------|:----:|");

    const sorted = [...report].sort((a, b) => a.name.localeCompare(b.name));
    for (const r of sorted) {
      lines.push(`| ${r.name} | ${fmt(r.gasOld)} | ${fmt(r.gasNew)} | ${fmtDelta(r.gasDelta)} | ${fmt(r.dslOld)} | ${fmt(r.dslNew)} | ${fmtDelta(r.dslDelta)} |`);
    }

    if (notUpdated.length > 0) {
      lines.push("");
      lines.push("### ❌ 갱신 실패");
      notUpdated.forEach((s) => lines.push(`- ${s}`));
    }

    const summaryContent = lines.join("\n") + "\n";
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (summaryPath) {
      appendFileSync(summaryPath, summaryContent);
    } else {
      console.log(summaryContent);
    }

    // 2일 이상 갱신 안 된 주유소 감지 → Telegram 알림
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const stale = await collection
      .find({
        isActive: true,
        opinet_id: { $exists: true, $ne: null },
        $or: [
          { "prices.updatedAt": { $lt: twoDaysAgo } },
          { "prices.updatedAt": { $exists: false } },
        ],
      })
      .toArray();

    if (stale.length > 0) {
      const staleLines = stale.map((s) => {
        const lastUpdate = s.prices?.updatedAt
          ? `마지막 갱신: ${s.prices.updatedAt.slice(0, 10)}`
          : "가격 정보 없음";
        return `• <b>${s.name}</b> (${s.opinet_id}) — ${lastUpdate}`;
      });
      const msg = [
        `⚠️ <b>가격 갱신 이상 감지</b>`,
        ``,
        `다음 주유소가 2일 이상 가격 미갱신 상태입니다:`,
        ...staleLines,
        ``,
        `폐업이면 답장: <code>/inactive {opinet_id}</code>`,
      ].join("\n");
      await sendTelegram(msg);
      console.log(`\nTelegram 알림 전송: ${stale.length}개 주유소 미갱신`);
    }
  } finally {
    await client.close();
  }
}

refreshPrices().catch(console.error);
