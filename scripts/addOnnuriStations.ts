/**
 * 온누리상품권 전용 주유소 DB 신규 추가
 *
 * 사용법: npm run onnuri:add
 *
 * linkOnnuri.ts 실행 후 미매칭된 주유소(상생카드 DB에 없는 온누리 전용 가맹점)를
 * 오피넷 API로 상세 정보를 가져와 DB에 새 도큐먼트로 삽입한다.
 * 삽입 후 자동으로 linkOnnuri.ts 로직(onnuri: true 마킹)을 수행한다.
 */
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { MongoClient } from "mongodb";
import { katecToWgs84 } from "../lib/geo/coordinateConverter";
import { BRAND_NAMES } from "../types";
import type { OpinetStationDetail } from "../lib/opinet/types";
import type { District } from "../types";

config({ path: path.join(__dirname, "..", ".env.local") });

const API_KEY = process.env.OPINET_API_KEY!;
const MONGODB_URI = process.env.MONGODB_URI!;
const OUTPUT_FINAL = path.join(__dirname, "data", "output_final.json");
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface OnnuriEntry {
  가맹점명: string;
  소속시장명: string;
  opinet_station_id: string;
  opinet_상호: string;
  market_위도?: number;
  market_경도?: number;
  match_score: number;
}

const DISTRICTS: District[] = ["광산구", "서구", "북구", "동구", "남구"];

function extractDistrict(address: string): District | undefined {
  return DISTRICTS.find((d) => address.includes(d));
}

function extractDong(address: string): string {
  // e.g. "광주광역시 서구 풍서우로 128" → 동 없음, "광주광역시 북구 우산동 1234" → "우산동"
  const match = address.match(/([가-힣]+동|[가-힣]+가)\b/);
  return match ? match[1] : "";
}

async function fetchDetail(id: string): Promise<OpinetStationDetail | null> {
  const url = `https://www.opinet.co.kr/api/detailById.do?code=${API_KEY}&out=json&id=${id}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.RESULT?.OIL?.[0] ?? null;
}

async function main() {
  const entries: OnnuriEntry[] = JSON.parse(
    fs.readFileSync(OUTPUT_FINAL, "utf-8")
  );

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const col = client.db("gwangju-oil").collection("stations");

  // 이미 DB에 있는 opinet_id 목록
  const existing = await col
    .find({ opinet_id: { $exists: true } }, { projection: { opinet_id: 1 } })
    .toArray();
  const existingIds = new Set(existing.map((s) => s.opinet_id as string));

  // 현재 최대 ON 번호 파악
  const lastOn = await col
    .find({ uni_id: /^ON/ }, { projection: { uni_id: 1 } })
    .sort({ uni_id: -1 })
    .limit(1)
    .toArray();
  let onCounter =
    lastOn.length > 0
      ? parseInt(lastOn[0].uni_id.replace("ON", ""), 10) + 1
      : 1;

  const missing = entries.filter(
    (e) => !existingIds.has(e.opinet_station_id)
  );

  console.log(`미매칭 온누리 전용 주유소: ${missing.length}건\n`);

  let inserted = 0;
  let failed = 0;

  for (const entry of missing) {
    console.log(`  처리 중: ${entry.가맹점명} (${entry.opinet_station_id})`);
    const detail = await fetchDetail(entry.opinet_station_id);
    await delay(300);

    if (!detail) {
      console.log(`    ✗ 오피넷 상세 없음 — 건너뜀`);
      failed++;
      continue;
    }

    const { lng, lat } = katecToWgs84(detail.GIS_X_COOR, detail.GIS_Y_COOR);
    const address = detail.NEW_ADR || detail.VAN_ADR || "";
    const district = extractDistrict(address);
    const dong = extractDong(address);
    const brand = detail.POLL_DIV_CO || "ETC";
    const brandName = BRAND_NAMES[brand] ?? "기타";
    const uniId = `ON${String(onCounter).padStart(4, "0")}`;
    onCounter++;

    const now = new Date().toISOString();
    const doc = {
      uni_id: uniId,
      opinet_id: detail.UNI_ID,
      name: detail.OS_NM,
      brand,
      brandName,
      address,
      addressOld: detail.VAN_ADR || "",
      district: district ?? "서구",
      dong,
      location: {
        type: "Point" as const,
        coordinates: [lng, lat] as [number, number],
      },
      katec: { x: detail.GIS_X_COOR, y: detail.GIS_Y_COOR },
      prices: { updatedAt: now },
      sangsaeng: { matched: false },
      onnuri: true,
      isActive: true,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await col.insertOne(doc);
      console.log(`    ✓ 삽입 완료 — ${uniId} / ${detail.OS_NM} / ${address}`);
      inserted++;
    } catch (e: any) {
      console.log(`    ✗ 삽입 실패: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`  삽입: ${inserted}건 / 실패: ${failed}건`);
  console.log(`\n  가격은 prices:refresh 실행 시 자동 갱신됩니다.`);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
