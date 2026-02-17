"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import type { FuelType, StationWithDistance } from "@/types";
import { useFavorites } from "@/lib/hooks/useFavorites";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import StationList from "@/components/station/StationList";
import FuelTypeToggle from "@/components/filters/FuelTypeToggle";

const KakaoMap = dynamic(() => import("@/components/map/KakaoMap"), {
  ssr: false,
  loading: () => (
    <div className="map-container w-full bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500 text-sm">지도 로딩 중...</p>
    </div>
  ),
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function FavoritesPage() {
  const [fuelType, setFuelType] = useState<FuelType>("gasoline");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const { favoriteIds, toggleFavorite } = useFavorites();
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  // 즐겨찾기된 주유소 데이터 가져오기
  const idsParam = favoriteIds.join(",");
  const { data, isLoading } = useSWR<{ stations: StationWithDistance[] }>(
    favoriteIds.length > 0
      ? `/api/stations?ids=${idsParam}&fuelType=${fuelType}&sortBy=price`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const stations = data?.stations ?? [];

  return (
    <div className="flex flex-col min-h-dvh pb-16">
      <Header />

      {/* 지도 */}
      <KakaoMap
        stations={stations}
        favoriteIds={favoriteSet}
        fuelType={fuelType}
        selectedStationId={selectedStationId}
        onStationSelect={setSelectedStationId}
      />

      {/* 필터 영역 */}
      <div className="bg-white border-b border-gray-200 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            즐겨찾기 ({favoriteIds.length})
          </span>
          <FuelTypeToggle value={fuelType} onChange={setFuelType} />
        </div>
      </div>

      {/* 주유소 리스트 */}
      <div className="flex-1 bg-gray-50">
        {favoriteIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <svg
              className="w-12 h-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <p className="text-sm text-gray-500">
              즐겨찾기한 주유소가 없습니다
            </p>
            <p className="text-xs text-gray-400">
              주유소 카드의 하트 아이콘을 눌러 추가하세요
            </p>
          </div>
        ) : (
          <StationList
            stations={stations}
            fuelType={fuelType}
            favoriteIds={favoriteSet}
            selectedStationId={selectedStationId}
            isLoading={isLoading}
            onFavoriteToggle={toggleFavorite}
            onStationSelect={setSelectedStationId}
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
