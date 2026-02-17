/**
 * 오피넷에서 광주 HD현대오일뱅크 주유소 검색
 * POLL_DIV_CD로 브랜드 구분: SKE(SK), GSC(GS), SOL(S-Oil), HDO(현대오일뱅크), etc.
 */
import * as dns from "dns";
import * as path from "path";
import { config } from "dotenv";
import { wgs84ToKatec, katecToWgs84 } from "../lib/geo/coordinateConverter";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
config({ path: path.join(__dirname, "..", ".env.local") });

const API_KEY = process.env.OPINET_API_KEY!;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const GWANGJU_CENTERS = [
  { name: "광산구 중심", lat: 35.1397, lng: 126.7930 },
  { name: "광산구 북부", lat: 35.1900, lng: 126.7800 },
  { name: "광산구 서부(삼도)", lat: 35.1633, lng: 126.6988 },
  { name: "서구", lat: 35.1487, lng: 126.8560 },
  { name: "북구", lat: 35.1740, lng: 126.9120 },
  { name: "북구 북부", lat: 35.2100, lng: 126.9100 },
  { name: "동구", lat: 35.1460, lng: 126.9230 },
  { name: "남구", lat: 35.1330, lng: 126.9020 },
  { name: "남구 남부", lat: 35.1000, lng: 126.8900 },
];

async function main() {
  const allIds = new Set<string>();
  const stationMap = new Map<string, any>();

  // Collect all stations
  for (const center of GWANGJU_CENTERS) {
    const katec = wgs84ToKatec(center.lng, center.lat);
    const url = `https://www.opinet.co.kr/api/aroundAll.do?code=${API_KEY}&out=json&x=${Math.round(katec.x)}&y=${Math.round(katec.y)}&radius=5000&prodcd=B027&sort=1`;
    const res = await fetch(url);
    const data = await res.json();
    const stations = data.RESULT?.OIL || [];
    for (const s of stations) {
      if (!allIds.has(s.UNI_ID)) {
        allIds.add(s.UNI_ID);
        stationMap.set(s.UNI_ID, s);
      }
    }
    await delay(300);
  }

  console.log(`총 ${allIds.size}개 수집, 현대오일뱅크 필터링...\n`);

  // Get details for all and filter by POLL_DIV_CD
  const hdoStations: Array<{ id: string; name: string; addr: string; pollDiv: string }> = [];

  let count = 0;
  for (const id of allIds) {
    const url = `https://www.opinet.co.kr/api/detailById.do?code=${API_KEY}&out=json&id=${id}`;
    const res = await fetch(url);
    const data = await res.json();
    const d = data.RESULT?.OIL?.[0];
    if (d && d.POLL_DIV_CD === "HDO") {
      hdoStations.push({
        id: d.UNI_ID,
        name: d.OS_NM,
        addr: d.NEW_ADR || d.VAN_ADR,
        pollDiv: d.POLL_DIV_CD,
      });
    }
    count++;
    if (count % 30 === 0) console.log(`  ${count}/${allIds.size}...`);
    await delay(150);
  }

  console.log(`\n=== 광주 HD현대오일뱅크 주유소: ${hdoStations.length}개 ===\n`);
  for (const s of hdoStations) {
    console.log(`  ${s.id} | ${s.name} | ${s.addr}`);
  }

  // Output as JSON for sangsaeng-gas-stations.json format
  console.log("\n=== sangsaeng JSON 형식 ===");
  const jsonEntries = hdoStations.map((s) => ({
    name: s.name,
    category: "현대정유오일뱅크",
    address: s.addr.replace(/광주광역시/g, "광주").replace(/\s+\(.*?\)/g, ""),
    dataDate: "2026-02-17",
  }));
  console.log(JSON.stringify(jsonEntries, null, 2));
}

main().catch(console.error);
