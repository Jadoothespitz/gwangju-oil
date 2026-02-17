/** 오피넷 API 응답 타입 */

export interface OpinetDetailResponse {
  RESULT: {
    OIL: OpinetStationDetail[];
  };
}

export interface OpinetStationDetail {
  UNI_ID: string;
  OS_NM: string;
  POLL_DIV_CD: string;
  SIGUNCD: string;
  NEW_ADR: string;
  VAN_ADR: string;
  TEL: string;
  GIS_X_COOR: number;
  GIS_Y_COOR: number;
  LPG_YN: string;
  MAINT_YN: string;
  CAR_WASH_YN: string;
  CVS_YN: string;
  KPETRO_YN: string;
  OIL_PRICE: Array<{
    PRODCD: string;
    PRICE: number;
    TRADE_DT: string;
    TRADE_TM: string;
  }>;
}

export interface OpinetAroundResponse {
  RESULT: {
    OIL: OpinetAroundStation[];
  };
}

export interface OpinetAroundStation {
  UNI_ID: string;
  OS_NM: string;
  POLL_DIV_CD: string;
  PRICE: number;
  DISTANCE: number;
  GIS_X_COOR: number;
  GIS_Y_COOR: number;
  NEW_ADR?: string;
  VAN_ADR?: string;
}

export interface OpinetLowPriceResponse {
  RESULT: {
    OIL: OpinetLowPriceStation[];
  };
}

export interface OpinetLowPriceStation {
  UNI_ID: string;
  OS_NM: string;
  POLL_DIV_CD: string;
  PRICE: number;
  NEW_ADR: string;
  VAN_ADR: string;
  GIS_X_COOR: number;
  GIS_Y_COOR: number;
}

export interface OpinetAvgPriceResponse {
  RESULT: {
    OIL: OpinetAvgPrice[];
  };
}

export interface OpinetAvgPrice {
  SIDOCD: string;
  SIDONM: string;
  PRODCD: string;
  PRICE: number;
  DIFF: number;
  DATE: string;
}

export interface OpinetSigunguCode {
  SIDO_CD: string;
  SIGUNGU_CD: string;
  SIGUNGU_NM: string;
}
