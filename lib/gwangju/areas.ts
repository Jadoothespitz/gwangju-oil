import type { District } from "@/types";

export interface AreaInfo {
  name: string;
  district: District;
  dongs: string[];
  center: { lat: number; lng: number };
}

export const AREAS: Record<string, AreaInfo> = {
  상무지구: {
    name: "상무지구",
    district: "서구",
    dongs: ["치평동", "쌍촌동", "상무1동", "상무2동"],
    center: { lat: 35.1530, lng: 126.8847 },
  },
  금호지구: {
    name: "금호지구",
    district: "서구",
    dongs: ["금호동", "풍암동"],
    center: { lat: 35.1310, lng: 126.8707 },
  },
  첨단지구: {
    name: "첨단지구",
    district: "광산구",
    dongs: ["첨단1동", "첨단2동", "월계동", "산월동"],
    center: { lat: 35.2201, lng: 126.8486 },
  },
  수완지구: {
    name: "수완지구",
    district: "광산구",
    dongs: ["수완동", "신가동", "장덕동"],
    center: { lat: 35.1895, lng: 126.8274 },
  },
  하남지구: {
    name: "하남지구",
    district: "광산구",
    dongs: ["하남동", "대촌동"],
    center: { lat: 35.1023, lng: 126.8114 },
  },
  선운지구: {
    name: "선운지구",
    district: "광산구",
    dongs: ["선운동"],
    center: { lat: 35.1360, lng: 126.7590 },
  },
  운남지구: {
    name: "운남지구",
    district: "광산구",
    dongs: ["운남동"],
    center: { lat: 35.1783, lng: 126.7950 },
  },
};

/** 동 이름으로 해당 지구를 찾기 */
export function getAreaByDong(dong: string): string | undefined {
  for (const [areaName, info] of Object.entries(AREAS)) {
    if (info.dongs.some((d) => dong.includes(d) || d.includes(dong))) {
      return areaName;
    }
  }
  return undefined;
}

/** 구별 지구 목록 */
export function getAreasByDistrict(district: District): AreaInfo[] {
  return Object.values(AREAS).filter((area) => area.district === district);
}
