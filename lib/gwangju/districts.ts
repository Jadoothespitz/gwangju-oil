import type { District } from "@/types";

export interface DistrictInfo {
  name: District;
  center: { lat: number; lng: number };
}

export const DISTRICT_INFO: Record<District, DistrictInfo> = {
  광산구: { name: "광산구", center: { lat: 35.1396, lng: 126.7934 } },
  서구: { name: "서구", center: { lat: 35.1519, lng: 126.8895 } },
  북구: { name: "북구", center: { lat: 35.1744, lng: 126.9120 } },
  동구: { name: "동구", center: { lat: 35.1461, lng: 126.9231 } },
  남구: { name: "남구", center: { lat: 35.1328, lng: 126.9026 } },
};

// 광주광역시 전체 중심 좌표
export const GWANGJU_CENTER = { lat: 35.1595, lng: 126.8526 };

// 광주광역시 기본 지도 레벨 (카카오맵)
export const GWANGJU_MAP_LEVEL = 8;
