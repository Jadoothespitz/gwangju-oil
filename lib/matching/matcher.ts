import type { SangsaengMerchant, OpinetStation, MatchMethod } from "@/types";
import { isAddressMatch, extractDistrict } from "./addressNormalizer";
import { jaroWinkler, normalizeStationName } from "./fuzzyMatch";
import { MANUAL_OVERRIDES } from "./manualOverrides";
import { haversineDistance } from "@/lib/geo/distance";

export interface MatchResult {
  sangsaeng: SangsaengMerchant;
  opinet?: OpinetStation;
  score: number;
  method: MatchMethod;
}

/**
 * 상생카드 가맹점과 오피넷 주유소를 매칭 (2-pass)
 *
 * Pass 1: 수동 오버라이드 → 주소 정확 매칭 (전체 순회)
 * Pass 2: 이름 유사도 → 좌표 근접 (남은 것들만)
 *
 * 2-pass 방식으로 주소가 정확히 일치하는 매칭이 fuzzy 매칭에 밀리는 문제 방지
 */
export function matchStations(
  sangsaengList: SangsaengMerchant[],
  opinetList: OpinetStation[],
  opinetCoords?: Map<string, { lat: number; lng: number }>,
  sangsaengCoords?: Map<string, { lat: number; lng: number }>
): {
  matched: MatchResult[];
  unmatched: SangsaengMerchant[];
} {
  const matched: MatchResult[] = [];
  const usedOpinetIds = new Set<string>();
  const matchedSangsaengIdx = new Set<number>();

  // === Pass 1: 수동 오버라이드 + 주소 정확 매칭 ===
  for (let i = 0; i < sangsaengList.length; i++) {
    const merchant = sangsaengList[i];

    // Step 1: 수동 오버라이드 확인
    const manualId = MANUAL_OVERRIDES[merchant.name];
    if (manualId) {
      const opinet = opinetList.find((s) => s.UNI_ID === manualId);
      if (opinet) {
        matched.push({ sangsaeng: merchant, opinet, score: 1.0, method: "manual" });
        usedOpinetIds.add(manualId);
        matchedSangsaengIdx.add(i);
        continue;
      }
    }

    // Step 2: 주소 정확 매칭
    for (const opinet of opinetList) {
      if (usedOpinetIds.has(opinet.UNI_ID)) continue;

      if (
        isAddressMatch(merchant.address, opinet.NEW_ADR) ||
        isAddressMatch(merchant.address, opinet.VAN_ADR)
      ) {
        matched.push({ sangsaeng: merchant, opinet, score: 1.0, method: "exact_address" });
        usedOpinetIds.add(opinet.UNI_ID);
        matchedSangsaengIdx.add(i);
        break;
      }
    }
  }

  // === Pass 2: 이름 유사도 + 좌표 근접 (남은 것들만) ===
  const remaining = sangsaengList
    .map((m, i) => ({ merchant: m, idx: i }))
    .filter(({ idx }) => !matchedSangsaengIdx.has(idx));

  for (const { merchant } of remaining) {
    // Step 3: 같은 구 내 이름 유사도 매칭
    const merchantDistrict = extractDistrict(merchant.address);
    let bestFuzzyScore = 0;
    let bestFuzzyMatch: OpinetStation | null = null;

    for (const opinet of opinetList) {
      if (usedOpinetIds.has(opinet.UNI_ID)) continue;

      const opinetDistrict =
        extractDistrict(opinet.NEW_ADR) || extractDistrict(opinet.VAN_ADR);

      if (merchantDistrict && opinetDistrict && merchantDistrict !== opinetDistrict) {
        continue;
      }

      const nameScore = jaroWinkler(
        normalizeStationName(merchant.name),
        normalizeStationName(opinet.OS_NM)
      );

      if (nameScore > bestFuzzyScore && nameScore >= 0.85) {
        bestFuzzyScore = nameScore;
        bestFuzzyMatch = opinet;
      }
    }

    if (bestFuzzyMatch) {
      matched.push({
        sangsaeng: merchant,
        opinet: bestFuzzyMatch,
        score: bestFuzzyScore,
        method: "fuzzy_name",
      });
      usedOpinetIds.add(bestFuzzyMatch.UNI_ID);
      continue;
    }

    // Step 4: 좌표 근접 매칭
    if (sangsaengCoords && opinetCoords) {
      const merchantCoord = sangsaengCoords.get(merchant.name);
      if (merchantCoord) {
        let bestProximityDist = Infinity;
        let bestProximityMatch: OpinetStation | null = null;

        for (const opinet of opinetList) {
          if (usedOpinetIds.has(opinet.UNI_ID)) continue;

          const opinetCoord = opinetCoords.get(opinet.UNI_ID);
          if (!opinetCoord) continue;

          const dist = haversineDistance(
            merchantCoord.lat,
            merchantCoord.lng,
            opinetCoord.lat,
            opinetCoord.lng
          );

          if (dist < 300 && dist < bestProximityDist) {
            const nameScore = jaroWinkler(
              normalizeStationName(merchant.name),
              normalizeStationName(opinet.OS_NM)
            );
            const nameThreshold = dist < 100 ? 0.4 : 0.6;
            if (nameScore >= nameThreshold) {
              bestProximityDist = dist;
              bestProximityMatch = opinet;
            }
          }
        }

        if (bestProximityMatch) {
          const proxScore =
            0.7 * (1 - bestProximityDist / 300) +
            0.3 *
              jaroWinkler(
                normalizeStationName(merchant.name),
                normalizeStationName(bestProximityMatch.OS_NM)
              );
          matched.push({
            sangsaeng: merchant,
            opinet: bestProximityMatch,
            score: proxScore,
            method: "proximity",
          });
          usedOpinetIds.add(bestProximityMatch.UNI_ID);
          continue;
        }
      }
    }
  }

  // 미매칭 목록
  const unmatched = sangsaengList.filter(
    (_, i) => !matchedSangsaengIdx.has(i) && !matched.some((m) => m.sangsaeng === sangsaengList[i])
  );

  return { matched, unmatched };
}
