/** 오피넷 API 지역 코드 */

export const GWANGJU_SIDO_CODE = "16";

export const GWANGJU_SIGUNGU_CODES: Record<string, string> = {
  광산구: "1604",
  동구: "1601",
  서구: "1602",
  남구: "1603",
  북구: "1605",
};

// 참고: 위 코드는 오피넷 API의 sigunguCode.do 응답으로 확인 필요
// areaCode.do → sido=16 (광주), sigunguCode.do → sido=16 으로 조회
