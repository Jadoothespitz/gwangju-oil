import { config } from "dotenv";
import * as path from "path";
import { wgs84ToKatec } from "../lib/geo/coordinateConverter";

config({ path: path.join(__dirname, "..", ".env.local") });

async function debugApi() {
  // 카카오 REST API 테스트
  const KAKAO_KEY = process.env.KAKAO_REST_API_KEY!;
  console.log("Kakao key length:", KAKAO_KEY.length);

  console.log("\n=== 카카오 주소 검색 API ===");
  const url1 = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent("광주 서구 상무대로 714")}`;
  const resp1 = await fetch(url1, {
    headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
  });
  console.log("Status:", resp1.status);
  const text1 = await resp1.text();
  console.log("Response:", text1.substring(0, 500));

  console.log("\n=== 카카오 키워드 검색 API ===");
  const url2 = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent("광주 주유소")}`;
  const resp2 = await fetch(url2, {
    headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
  });
  console.log("Status:", resp2.status);
  const text2 = await resp2.text();
  console.log("Response:", text2.substring(0, 500));
}

debugApi().catch(console.error);
