/**
 * Jaro-Winkler 유사도 계산 (한국어 문자열에 적합)
 * 0 = 완전히 다름, 1 = 완전히 같음
 */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const jaro = jaroSimilarity(s1, s2);

  // Winkler 보정: 앞부분이 같은 문자열에 가산점
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

function jaroSimilarity(s1: string, s2: string): number {
  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;

  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3
  );
}

/** 주유소 이름 정규화 (비교 전 전처리) */
export function normalizeStationName(name: string): string {
  return name
    .replace(/\(주\)/g, "")
    .replace(/주유소/g, "")
    .replace(/셀프/g, "")
    .replace(/self/gi, "")
    .replace(/\s+/g, "")
    .trim();
}
