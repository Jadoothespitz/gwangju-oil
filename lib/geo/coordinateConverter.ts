import proj4 from "proj4";

// KATEC (TM128) - 오피넷에서 사용하는 좌표계
const KATEC =
  "+proj=tmerc +lat_0=38 +lon_0=128 +k=0.9999 +x_0=400000 +y_0=600000 " +
  "+ellps=bessel +units=m +no_defs " +
  "+towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43";

// WGS84 - 카카오맵/일반 GPS에서 사용하는 좌표계
const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

/** KATEC 좌표를 WGS84 (위경도)로 변환 */
export function katecToWgs84(
  x: number,
  y: number
): { lng: number; lat: number } {
  const [lng, lat] = proj4(KATEC, WGS84, [x, y]);
  return { lng, lat };
}

/** WGS84 (위경도)를 KATEC 좌표로 변환 */
export function wgs84ToKatec(
  lng: number,
  lat: number
): { x: number; y: number } {
  const [x, y] = proj4(WGS84, KATEC, [lng, lat]);
  return { x, y };
}
