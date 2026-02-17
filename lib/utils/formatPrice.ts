/** 가격 포맷 (예: 1580 → "1,580") */
export function formatPrice(price: number | undefined): string {
  if (price == null) return "-";
  return price.toLocaleString("ko-KR");
}

/** 거리 포맷 (미터 → "1.2km" or "800m") */
export function formatDistance(meters: number | undefined): string {
  if (meters == null) return "";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
