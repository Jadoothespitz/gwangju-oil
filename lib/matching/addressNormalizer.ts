import type { District } from "@/types";

/** 주소에서 공백, 특수문자 제거 후 정규화 */
export function normalizeAddress(address: string): string {
  return address
    .replace(/\s+/g, " ")
    .replace(/광주광역시\s*/g, "")
    .replace(/광주시\s*/g, "")
    .trim();
}

/** 주소에서 구 이름 추출 */
export function extractDistrict(address: string): District | undefined {
  const districts: District[] = ["광산구", "서구", "북구", "동구", "남구"];
  for (const d of districts) {
    if (address.includes(d)) return d;
  }
  return undefined;
}

/** 주소에서 동 이름 추출 */
export function extractDong(address: string): string | undefined {
  // 도로명주소에서 동 추출 (예: "광산구 하남동 123" → "하남동")
  const dongMatch = address.match(
    /([가-힣]+[0-9]*동)/
  );
  if (dongMatch) {
    // 구 이름이 아닌 실제 동 이름만 반환
    const dong = dongMatch[1];
    if (!dong.endsWith("구")) return dong;
  }
  return undefined;
}

/** 도로명주소의 핵심 부분만 추출 (도로명 + 번호) */
export function extractRoadCore(address: string): string | undefined {
  // "서구 상무대로 123" → "상무대로 123"
  const roadMatch = address.match(
    /([가-힣]+(?:로|길|대로)\s*\d+(?:-\d+)?)/
  );
  return roadMatch ? roadMatch[1].replace(/\s+/g, "") : undefined;
}

/** 두 주소가 같은 위치인지 비교 */
export function isAddressMatch(addr1: string, addr2: string): boolean {
  const n1 = normalizeAddress(addr1);
  const n2 = normalizeAddress(addr2);

  // 완전 일치
  if (n1 === n2) return true;

  // 도로명 핵심 부분 비교
  const road1 = extractRoadCore(n1);
  const road2 = extractRoadCore(n2);
  if (road1 && road2 && road1 === road2) return true;

  return false;
}
