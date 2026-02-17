const hits = new Map<string, { count: number; resetAt: number }>();

// 주기적으로 만료된 엔트리 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of hits) {
    if (now > val.resetAt) hits.delete(key);
  }
}, 60_000);

/**
 * 간단한 in-memory 레이트 리미터
 * @param key - 식별 키 (IP + 경로 등)
 * @param limit - 허용 횟수
 * @param windowMs - 시간 창 (ms)
 * @returns true면 차단해야 함
 */
export function isRateLimited(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  return entry.count > limit;
}

/** NextRequest에서 IP 추출 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
