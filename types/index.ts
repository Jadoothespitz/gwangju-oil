export type District = "광산구" | "서구" | "북구" | "동구" | "남구";

export type FuelType = "gasoline" | "diesel";

export type SortBy = "price" | "distance";

export type MatchMethod = "exact_address" | "fuzzy_name" | "proximity" | "manual";

export interface Station {
  _id: string;
  uni_id: string;
  opinet_id?: string;
  name: string;
  brand: string;
  brandName: string;
  address: string;
  addressOld: string;
  district: District;
  dong: string;
  area?: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  katec: {
    x: number;
    y: number;
  };
  prices: {
    gasoline?: number;
    diesel?: number;
    updatedAt: string;
  };
  sangsaeng: {
    matched: boolean;
    merchantName?: string;
    merchantAddress?: string;
    matchScore?: number;
    matchMethod?: MatchMethod;
  };
  isActive: boolean;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StationWithDistance extends Station {
  distance?: number; // meters
}

export interface StationListQuery {
  district?: District;
  area?: string;
  dong?: string;
  fuelType: FuelType;
  sortBy: SortBy;
  sangsaengOnly?: boolean;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
}

export interface StationListResponse {
  stations: StationWithDistance[];
  total: number;
  page: number;
  limit: number;
}

export interface SangsaengMerchant {
  name: string;       // 업체명
  category: string;   // 업종명
  address: string;    // 업체주소
  dataDate: string;   // 데이터기준일
}

export interface OpinetStation {
  UNI_ID: string;
  OS_NM: string;
  POLL_DIV_CD: string;
  NEW_ADR: string;
  VAN_ADR: string;
  TEL: string;
  GIS_X_COOR: number;
  GIS_Y_COOR: number;
  PRICE?: number;
  PRODCD?: string;
  TRADE_DT?: string;
  TRADE_TM?: string;
}

export const BRAND_NAMES: Record<string, string> = {
  SKE: "SK에너지",
  GSC: "GS칼텍스",
  HDO: "현대오일뱅크",
  SOL: "S-OIL",
  RTO: "자영",
  ETC: "기타",
  E1G: "E1",
  SKG: "SK가스",
};

export const DISTRICTS: District[] = ["광산구", "서구", "북구", "동구", "남구"];

export const FUEL_CODES = {
  gasoline: "B027",
  diesel: "D047",
} as const;
