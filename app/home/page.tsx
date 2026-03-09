"use client";

import Link from "next/link";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { useAvgPrices } from "@/lib/hooks/useAvgPrices";

const FEEDBACK_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfkrHOkpLBrjh40E_J584whovB9kGM4ySqmUu2R7KM6Y8ODcA/viewform?usp=header";

function DiffBadge({ diff }: { diff: number | null }) {
  if (diff == null) return null;
  if (diff === 0) return <span className="text-xs text-gray-400">변동없음</span>;
  const up = diff > 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-red-500" : "text-blue-500"}`}>
      {up ? "▲" : "▼"}{Math.abs(diff)}
    </span>
  );
}

function PriceCell({ price, diff }: { price: number | null; diff: number | null }) {
  return (
    <td className="text-center py-3 px-2">
      {price != null ? (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-base font-bold text-gray-900">
            {price.toLocaleString()}
          </span>
          <DiffBadge diff={diff} />
        </div>
      ) : (
        <span className="text-sm text-gray-300">—</span>
      )}
    </td>
  );
}

function PriceSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" />
      <div className="h-16 bg-gray-200 rounded" />
      <div className="h-16 bg-gray-200 rounded" />
    </div>
  );
}

export default function HomePage() {
  const { data, isLoading } = useAvgPrices();

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Header />

      <div className="flex-1 overflow-y-auto pb-16">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

          {/* 오늘의 유가 카드 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
              <h2 className="text-sm font-semibold text-blue-800">
                오늘의 평균 유가
                {data?.date && (
                  <span className="ml-2 text-xs font-normal text-blue-500">
                    {data.date.replace(/(\d{4})(\d{2})(\d{2})/, "$1.$2.$3")}
                  </span>
                )}
              </h2>
            </div>

            {isLoading ? (
              <div className="px-4 py-4">
                <PriceSkeleton />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left py-2 px-4 font-medium w-16">유종</th>
                    <th className="text-center py-2 px-2 font-medium">전국</th>
                    <th className="text-center py-2 px-2 font-medium">광주</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr>
                    <td className="text-left py-3 px-4 text-sm font-medium text-gray-600">휘발유</td>
                    <PriceCell
                      price={data?.national.gasoline.price ?? null}
                      diff={data?.national.gasoline.diff ?? null}
                    />
                    <PriceCell
                      price={data?.gwangju.gasoline.price ?? null}
                      diff={data?.gwangju.gasoline.diff ?? null}
                    />
                  </tr>
                  <tr>
                    <td className="text-left py-3 px-4 text-sm font-medium text-gray-600">경유</td>
                    <PriceCell
                      price={data?.national.diesel.price ?? null}
                      diff={data?.national.diesel.diff ?? null}
                    />
                    <PriceCell
                      price={data?.gwangju.diesel.price ?? null}
                      diff={data?.gwangju.diesel.diff ?? null}
                    />
                  </tr>
                </tbody>
              </table>
            )}
            <p className="text-[10px] text-gray-400 px-4 pb-2.5">단위: 원/L · 등락: 전일대비 · 출처: 오피넷</p>
          </div>

          {/* 바로가기 */}
          <div className="space-y-2">
            <Link
              href="/favorites"
              className="flex items-center justify-between w-full bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">⭐</span>
                <span className="text-sm font-medium text-gray-800">즐겨찾기 바로가기</span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <a
              href={FEEDBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">💬</span>
                <span className="text-sm font-medium text-gray-800">의견 보내기</span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* 푸터 */}
          <footer className="pt-2 pb-1 text-center space-y-1">
            <p className="text-[11px] text-gray-400">
              광주광역시 상생카드 가맹 주유소 유가 비교
            </p>
            <p className="text-[11px] text-gray-400">
              가격 정보 출처: 오피넷 · 상생카드 가맹점 정보는 광주광역시 제공
            </p>
          </footer>

        </div>
      </div>

      <BottomNav />
    </div>
  );
}
