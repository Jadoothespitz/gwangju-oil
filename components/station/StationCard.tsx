"use client";

import { useState, useEffect, useRef } from "react";
import type { StationWithDistance, FuelType } from "@/types";
import { formatPrice, formatDistance } from "@/lib/utils/formatPrice";
import { cn } from "@/lib/utils/cn";

interface StationCardProps {
  station: StationWithDistance;
  fuelType: FuelType;
  isFavorite: boolean;
  isSelected?: boolean;
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

const BRAND_STYLES: Record<string, { background: string; color: string }> = {
  SKE: { background: "#FFE5E9", color: "#EA002C" },   // SK에너지 Red
  GSC: { background: "#003087", color: "#00FF7F" },   // GS칼텍스 Blue bg + Bright Green text
  HDO: { background: "#00A86B", color: "#004B9B" },   // HD현대오일뱅크 Green bg + Blue text
  SOL: { background: "#FFF8D6", color: "#005F28" },   // S-OIL Yellow bg + Green text
  ALT: { background: "#FFF0E5", color: "#F06400" },   // 알뜰주유소 Orange
  RTO: { background: "#F3F4F6", color: "#6B7280" },   // 자영
  ETC: { background: "#F3F4F6", color: "#6B7280" },   // 기타
};

export default function StationCard({
  station,
  fuelType,
  isFavorite,
  isSelected,
  onFavoriteToggle,
  onClick,
}: StationCardProps) {
  const [showNav, setShowNav] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 드롭다운 닫기
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

  const price =
    fuelType === "diesel"
      ? station.prices.diesel
      : station.prices.gasoline;

  const otherPrice =
    fuelType === "diesel"
      ? station.prices.gasoline
      : station.prices.diesel;

  const brandStyle = BRAND_STYLES[station.brand] || BRAND_STYLES.ETC;

  // 가격 갱신 경과일 계산 (2일 이상이면 stale)
  const staleDays = station.prices.updatedAt
    ? Math.floor((Date.now() - new Date(station.prices.updatedAt).getTime()) / 86_400_000)
    : null;
  const isStale = staleDays != null && staleDays >= 2;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-3 cursor-pointer transition-all",
        isSelected
          ? "border-blue-500 shadow-md ring-1 ring-blue-200"
          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* 브랜드 + 주유소명 */}
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={brandStyle}
            >
              {station.brandName}
            </span>
            <h3 className="text-sm font-bold truncate">{station.name}</h3>
          </div>

          {/* 위치 정보 */}
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <span>{station.district}</span>
            {station.dong && (
              <>
                <span className="text-gray-300">·</span>
                <span>{station.dong}</span>
              </>
            )}
            {station.area && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-purple-600 font-medium">
                  {station.area}
                </span>
              </>
            )}
            {station.distance != null && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-blue-600 font-medium">
                  {formatDistance(station.distance)}
                </span>
              </>
            )}
          </div>

          {/* 가격 */}
          <div className="flex items-center gap-3">
            <div>
              <span className="text-xs text-gray-400">
                {fuelType === "diesel" ? "경유" : "휘발유"}
              </span>
              <p className="text-lg font-extrabold text-blue-700 leading-tight">
                {formatPrice(price)}
                <span className="text-xs font-normal text-gray-400 ml-0.5">
                  원
                </span>
              </p>
            </div>
            {otherPrice && (
              <div>
                <span className="text-xs text-gray-400">
                  {fuelType === "diesel" ? "휘발유" : "경유"}
                </span>
                <p className="text-sm font-semibold text-gray-600 leading-tight">
                  {formatPrice(otherPrice)}
                  <span className="text-xs font-normal text-gray-400 ml-0.5">
                    원
                  </span>
                </p>
              </div>
            )}
          </div>
          {isStale && (
            <p className="text-[10px] font-medium text-amber-600 mt-1">
              ⚠ {staleDays}일 전 가격 정보 (갱신 실패)
            </p>
          )}
        </div>

        {/* 즐겨찾기 + 길찾기 + 상생카드 */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle();
            }}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
          >
            <svg
              className={cn(
                "w-5 h-5",
                isFavorite ? "text-red-500 fill-red-500" : "text-gray-300"
              )}
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
              onClick={(e) => {
                e.stopPropagation();
                setShowNav(!showNav);
              }}
              className="p-1.5 rounded-full hover:bg-blue-50 transition-colors"
              aria-label="길찾기"
            >
              <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </button>
            {showNav && (
              <div
                className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 w-32"
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
                    className="block px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowNav(false)}
                  >
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>
          {station.sangsaeng.matched && (
            <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded whitespace-nowrap">
              상생
            </span>
          )}
          {station.onnuri && (
            <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded whitespace-nowrap">
              온누리
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
