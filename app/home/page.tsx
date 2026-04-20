"use client";

import Link from "next/link";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { useAvgPrices } from "@/lib/hooks/useAvgPrices";
import PriceChart from "@/components/PriceChart";

const FEEDBACK_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfkrHOkpLBrjh40E_J584whovB9kGM4ySqmUu2R7KM6Y8ODcA/viewform?usp=header";

function fmtDate(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/(\d{4})(\d{2})(\d{2})/, "$1.$2.$3");
}

function ChangePill({ diff }: { diff: number | null }) {
  if (diff == null) return null;
  if (diff === 0) return <span className="text-xs font-semibold text-[#C8C2B4]">변동없음</span>;
  const up = diff > 0;
  return (
    <span
      className="flex items-center gap-0.5 text-xs font-bold"
      style={{ color: up ? "#FF5A4C" : "#00B372", fontVariantNumeric: "tabular-nums" }}
    >
      {up ? (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12l7-7 7 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7 7 7-7" />
        </svg>
      )}
      {Math.abs(diff)}원
    </span>
  );
}

function PriceSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-3 bg-[#F3EFE5] rounded w-1/2" />
      <div className="h-8 bg-[#F3EFE5] rounded w-3/4" />
      <div className="h-3 bg-[#F3EFE5] rounded w-1/4" />
    </div>
  );
}

export default function HomePage() {
  const { data, isLoading } = useAvgPrices();

  const gwGas = data?.gwangju?.gasoline?.price ?? null;
  const gwDiesel = data?.gwangju?.diesel?.price ?? null;
  const natGas = data?.national?.gasoline?.price ?? null;

  // 전국 대비 광주 휘발유 차이 (양수면 광주가 저렴)
  const diffVsNat =
    gwGas != null && natGas != null ? Math.round((natGas - gwGas) * 100) / 100 : null;

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Header />

      <div className="flex-1 overflow-y-auto pb-16 bg-[#FAF7F0]">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

          {/* Hero 섹션 */}
          <div className="pt-1 pb-2">
            <p className="text-xs font-bold text-[#2046E5] tracking-[0.3px] mb-1">
              오늘의 광주 유가
              {data?.date && (
                <span className="font-medium text-[#3A3A44]"> · {fmtDate(data.date)}</span>
              )}
            </p>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-7 bg-[#F3EFE5] rounded w-2/3 mb-1" />
                <div className="h-7 bg-[#F3EFE5] rounded w-1/2" />
              </div>
            ) : diffVsNat != null ? (
              <h2
                className="font-extrabold text-[28px] text-[#0E0E12] leading-[1.1]"
                style={{ fontFamily: "'Paperlogy', 'Pretendard', sans-serif", letterSpacing: "-1.0px" }}
              >
                {diffVsNat > 0 ? (
                  <>전국보다 <span className="text-[#2046E5]">{diffVsNat}원</span> 싸네<br />아따, 역시 광주!</>
                ) : diffVsNat < 0 ? (
                  <>전국보다 <span className="text-[#FF5A4C]">{Math.abs(diffVsNat)}원</span> 비싸네<br />어매, 못살것다!</>
                ) : (
                  <>전국이랑 똑같네<br />오매나 웬일이여!</>
                )}
              </h2>
            ) : null}
          </div>

          {/* 가격 카드 2개 */}
          <div className="flex gap-2.5">
            {/* 휘발유 */}
            <div className="flex-1 bg-[#EEF1FF] rounded-[18px] p-3.5">
              <div className="flex items-center gap-1 text-xs font-bold text-[#2046E5] mb-1.5">
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="#2046E5">
                  <path d="M10 2c-2.6 4-5.2 7-5.2 10A5.2 5.2 0 0015.2 12c0-3-2.6-6-5.2-10z" />
                </svg>
                휘발유
              </div>
              {isLoading ? (
                <PriceSkeleton />
              ) : gwGas != null ? (
                <>
                  <div className="flex items-baseline gap-0.5 mb-1.5">
                    <span
                      className="text-[26px] font-extrabold text-[#0E0E12] leading-none"
                      style={{
                        fontFamily: "'Paperlogy', 'Pretendard', sans-serif",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-1px",
                      }}
                    >
                      {gwGas.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-semibold text-[rgba(14,14,18,0.55)]">원/L</span>
                  </div>
                  <ChangePill diff={data?.gwangju?.gasoline?.diff ?? null} />
                </>
              ) : (
                <span className="text-sm text-[#C8C2B4]">—</span>
              )}
            </div>

            {/* 경유 */}
            <div className="flex-1 bg-[#F3EFE5] rounded-[18px] p-3.5">
              <div className="flex items-center gap-1 text-xs font-bold text-[#0E0E12] mb-1.5">
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="#0E0E12">
                  <path d="M10 2c-2.6 4-5.2 7-5.2 10A5.2 5.2 0 0015.2 12c0-3-2.6-6-5.2-10z" />
                </svg>
                경유
              </div>
              {isLoading ? (
                <PriceSkeleton />
              ) : gwDiesel != null ? (
                <>
                  <div className="flex items-baseline gap-0.5 mb-1.5">
                    <span
                      className="text-[26px] font-extrabold text-[#0E0E12] leading-none"
                      style={{
                        fontFamily: "'Paperlogy', 'Pretendard', sans-serif",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-1px",
                      }}
                    >
                      {gwDiesel.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-semibold text-[rgba(14,14,18,0.55)]">원/L</span>
                  </div>
                  <ChangePill diff={data?.gwangju?.diesel?.diff ?? null} />
                </>
              ) : (
                <span className="text-sm text-[#C8C2B4]">—</span>
              )}
            </div>
          </div>

          {/* 전국 평균 비교 (서브 정보) */}
          {!isLoading && natGas != null && (
            <p className="text-[11px] text-[rgba(14,14,18,0.45)] text-center -mt-1">
              전국 평균 휘발유 {natGas.toLocaleString()}원 · 경유 {(data?.national?.diesel?.price ?? 0).toLocaleString()}원
            </p>
          )}

          {/* 유가 추이 차트 */}
          <PriceChart />

          {/* 바로가기 */}
          <div className="space-y-2">
            <Link
              href="/lab"
              className="flex items-center justify-between w-full bg-[#2046E5] hover:bg-[#1733B8] rounded-2xl px-4 py-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6M9 3v6.5L5.5 16A2 2 0 007.4 19h9.2a2 2 0 001.9-3L15 9.5V3M9 14h6" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">경제적 주유소 찾기</p>
                  <p className="text-xs text-white/70">내 연비 · 거리 반영한 순 주유량 계산</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/favorites"
              className="flex items-center justify-between w-full bg-white hover:bg-[#F3EFE5] rounded-2xl border border-[#E8E3D8] px-4 py-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#FFE4E0] rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#FF5A4C]" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-[#0E0E12]">즐겨찾기 바로가기</span>
              </div>
              <svg className="w-4 h-4 text-[#C8C2B4]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <a
              href={FEEDBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full bg-white hover:bg-[#F3EFE5] rounded-2xl border border-[#E8E3D8] px-4 py-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F3EFE5] rounded-xl flex items-center justify-center text-lg">
                  💬
                </div>
                <span className="text-sm font-bold text-[#0E0E12]">의견 보내기</span>
              </div>
              <svg className="w-4 h-4 text-[#C8C2B4]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* 푸터 */}
          <footer className="pt-2 pb-1 text-center space-y-1.5">
            <p className="text-[11px] text-[#C8C2B4]">
              비공식 서비스이며, 가격 정보의 정확성을 보장하지 않습니다.
            </p>
            <p className="text-[11px] text-[#C8C2B4]">
              가격: 오피넷 · 지도: 카카오 · 가맹점: 공공데이터포털
            </p>
            <p className="text-[10px] text-[#C8C2B4] opacity-70">
              각 정유사 브랜드명은 해당 기업의 등록상표입니다.
            </p>
            <Link
              href="/privacy"
              className="inline-block text-[11px] text-[#C8C2B4] underline hover:text-[#3A3A44]"
            >
              개인정보처리방침
            </Link>
          </footer>

        </div>
      </div>

      <BottomNav />
    </div>
  );
}
