"use client";

import { useState, useEffect, useRef } from "react";
import type { StationWithDistance, FuelType } from "@/types";
import { formatDistance } from "@/lib/utils/formatPrice";
import { cn } from "@/lib/utils/cn";
import ReportButton from "./ReportButton";

interface StationCardProps {
  station: StationWithDistance;
  fuelType: FuelType;
  isFavorite: boolean;
  isSelected?: boolean;
  rank?: number;
  onFavoriteToggle: () => void;
  onClick: () => void;
}

function getNavUrls(station: StationWithDistance) {
  const [lng, lat] = station.location.coordinates;
  const name = encodeURIComponent(station.name);
  return {
    kakao: `https://map.kakao.com/link/to/${name},${lat},${lng}`,
    naver: `https://map.naver.com/p/directions/-/-/${lng},${lat},${name}/-/car`,
    tmap: `tmap://route?goalx=${lng}&goaly=${lat}&goalname=${name}`,
  };
}

export default function StationCard({
  station,
  fuelType,
  isFavorite,
  isSelected,
  rank,
  onFavoriteToggle,
  onClick,
}: StationCardProps) {
  const [showNav, setShowNav] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showNav) return;
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setShowNav(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showNav]);

  useEffect(() => {
    if (!showNotice) return;
    const handleClick = (e: MouseEvent) => {
      if (noticeRef.current && !noticeRef.current.contains(e.target as Node)) {
        setShowNotice(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showNotice]);

  const price =
    fuelType === "diesel" ? station.prices.diesel : station.prices.gasoline;

  const staleDays = station.prices.updatedAt
    ? Math.floor((Date.now() - new Date(station.prices.updatedAt).getTime()) / 86_400_000)
    : null;
  const isStale = staleDays != null && staleDays >= 2;

  const hasVouchers = station.sangsaeng.matched || station.onnuri;

  const metaParts: string[] = [];
  if (station.brandName) metaParts.push(station.brandName);
  if (station.district) metaParts.push(station.district);
  if (station.dong) metaParts.push(station.dong);
  if (station.distance != null) metaParts.push(formatDistance(station.distance));

  return (
    <div
      className={cn(
        "bg-white rounded-[20px] border p-4 cursor-pointer transition-all",
        isSelected
          ? "border-[#2046E5] shadow-md ring-1 ring-[#EEF1FF]"
          : "border-[#E8E3D8] hover:border-[#C8C2B4] hover:shadow-sm"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        {/* 왼쪽: 순위 뱃지 + 이름/메타 */}
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {rank != null && (
            <span
              className={cn(
                "w-5 h-5 flex items-center justify-center rounded-md text-[11px] font-extrabold shrink-0 mt-0.5",
                rank === 1 ? "bg-[#2046E5] text-white" : "bg-[#F3EFE5] text-[#3A3A44]"
              )}
            >
              {rank}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-[#3A3A44] mb-0.5 truncate">
              {metaParts.join(" · ")}
            </p>
            <h3
              className="text-base font-bold text-[#0E0E12] leading-tight truncate"
              style={{ letterSpacing: "-0.4px" }}
            >
              {station.name}
            </h3>
            {isStale && (
              <p className="text-[10px] font-medium text-amber-600 mt-0.5">
                ⚠ {staleDays}일 전 가격 (갱신 실패)
              </p>
            )}
          </div>
        </div>

        {/* 오른쪽: 즐겨찾기/길찾기 + 가격 */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-0.5">
            <ReportButton stationUniId={station.uni_id} stationName={station.name} />
            <button
              onClick={(e) => { e.stopPropagation(); onFavoriteToggle(); }}
              className="p-1.5 rounded-full hover:bg-[#F3EFE5] transition-colors"
              aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            >
              <svg
                className={cn("w-4 h-4", isFavorite ? "text-[#FF5A4C]" : "text-[#C8C2B4]")}
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                fill={isFavorite ? "currentColor" : "none"}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
            <div className="relative" ref={navRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowNav(!showNav); }}
                className="p-1.5 rounded-full hover:bg-[#EEF1FF] transition-colors"
                aria-label="길찾기"
              >
                <svg className="w-4 h-4 text-[#2046E5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinejoin="round" d="M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
              </button>
              {showNav && (
                <div
                  className="absolute right-0 top-full mt-1 bg-white border border-[#E8E3D8] rounded-xl shadow-lg z-50 py-1 w-32"
                  onClick={(e) => e.stopPropagation()}
                >
                  {([
                    ["kakao", "카카오맵"],
                    ["naver", "네이버지도"],
                    ["tmap", "티맵"],
                  ] as const).map(([key, label]) => (
                    <a
                      key={key}
                      href={getNavUrls(station)[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2 text-xs text-[#0E0E12] hover:bg-[#FAF7F0] transition-colors"
                      onClick={() => setShowNav(false)}
                    >
                      {label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {price != null ? (
            <div className="flex items-baseline gap-0.5">
              <span
                className="text-[22px] font-extrabold text-[#0E0E12] leading-none"
                style={{
                  fontFamily: "'Paperlogy', 'Pretendard', sans-serif",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.7px",
                }}
              >
                {price.toLocaleString()}
              </span>
              <span className="text-[11px] font-semibold text-[#3A3A44]">원</span>
            </div>
          ) : (
            <span className="text-sm text-[#C8C2B4]">—</span>
          )}
        </div>
      </div>

      {/* 운영자 공지 */}
      {station.notice && (
        <div className="mt-3 pt-3 border-t border-dashed border-[#E8E3D8]">
          <div
            className="relative inline-block group"
            ref={noticeRef}
            onClick={(e) => { e.stopPropagation(); setShowNotice((v) => !v); }}
          >
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full cursor-pointer select-none">
              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 8v4M12 16h.01" />
              </svg>
              운영자 공지
            </span>
            <div
              className={cn(
                "absolute bottom-full left-0 mb-2 w-max max-w-[220px] bg-[#0E0E12] text-white text-[11px] leading-relaxed rounded-xl px-3 py-2 shadow-lg z-50 whitespace-pre-wrap pointer-events-none",
                "opacity-0 group-hover:opacity-100 transition-opacity",
                showNotice && "opacity-100"
              )}
            >
              {station.notice}
              <span className="absolute top-full left-4 border-4 border-transparent border-t-[#0E0E12]" />
            </div>
          </div>
        </div>
      )}

      {/* 상품권 섹션 */}
      {hasVouchers && (
        <div className="mt-3 pt-3 border-t border-dashed border-[#E8E3D8] flex items-center gap-2 flex-wrap">
          <svg className="w-3.5 h-3.5 text-[#2046E5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinejoin="round" d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4V8z" />
            <path strokeDasharray="2 2" d="M10 6v12" />
          </svg>
          <span className="text-[11px] font-semibold text-[#3A3A44]">사용 가능</span>
          {station.sangsaeng.matched && (
            <span className="text-[11px] font-bold text-[#2046E5] bg-[#EEF1FF] px-2.5 py-0.5 rounded-full">
              광주상생카드
            </span>
          )}
          {station.onnuri && (
            <span className="text-[11px] font-bold text-[#FF5A4C] bg-[#FFE4E0] px-2.5 py-0.5 rounded-full">
              온누리상품권
            </span>
          )}
        </div>
      )}
    </div>
  );
}
