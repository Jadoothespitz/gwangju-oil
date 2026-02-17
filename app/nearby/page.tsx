"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import type { FuelType, SortBy } from "@/types";
import { useNearby } from "@/lib/hooks/useNearby";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import StationList from "@/components/station/StationList";
import RadiusFilter from "@/components/filters/RadiusFilter";
import FuelTypeToggle from "@/components/filters/FuelTypeToggle";
import SortSelector from "@/components/filters/SortSelector";

const KakaoMap = dynamic(() => import("@/components/map/KakaoMap"), {
  ssr: false,
  loading: () => (
    <div className="map-container w-full bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500 text-sm">지도 로딩 중...</p>
    </div>
  ),
});

export default function NearbyPage() {
  const [radius, setRadius] = useState(3000);
  const [fuelType, setFuelType] = useState<FuelType>("gasoline");
  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const { lat, lng, error, loading, requestLocation } = useGeolocation();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const { stations, isLoading } = useNearby({
    lat,
    lng,
    radius,
    fuelType,
    sortBy,
  });

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  // 페이지 진입 시 위치 요청
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Header />

      {/* 지도 */}
      <div className="relative shrink-0">
        <KakaoMap
        stations={stations}
        favoriteIds={favoriteSet}
        fuelType={fuelType}
        center={lat && lng ? { lat, lng } : undefined}
        userLocation={lat && lng ? { lat, lng } : null}
        radius={radius}
        selectedStationId={selectedStationId}
        onStationSelect={setSelectedStationId}
      />
      </div>

      {/* 위치 상태 메시지 */}
      {(loading || error) && (
        <div className="bg-white border-b border-gray-200 px-3 py-2">
          {loading && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block" />
              위치를 가져오는 중...
            </p>
          )}
          {error && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-red-600">{error}</p>
              <button
                onClick={requestLocation}
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      )}

      {/* 필터 영역 */}
      <div className="bg-white border-b border-gray-200 px-3 py-2.5 space-y-2 shrink-0">
        {/* 반경 필터 */}
        <RadiusFilter value={radius} onChange={setRadius} />

        {/* 유종 + 정렬 */}
        <div className="flex items-center justify-between">
          <FuelTypeToggle value={fuelType} onChange={setFuelType} />
          <SortSelector value={sortBy} onChange={setSortBy} showDistance />
        </div>
      </div>

      {/* 주유소 리스트 */}
      <div className="flex-1 min-h-0 bg-gray-50 overflow-y-auto pb-16">
        {!lat && !lng && !loading && !error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <svg
              className="w-12 h-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <p className="text-sm text-gray-500">
              위치 정보가 필요합니다
            </p>
            <button
              onClick={requestLocation}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              내 위치 가져오기
            </button>
          </div>
        ) : (
          <StationList
            stations={stations}
            fuelType={fuelType}
            favoriteIds={favoriteSet}
            selectedStationId={selectedStationId}
            isLoading={isLoading || loading}
            onFavoriteToggle={toggleFavorite}
            onStationSelect={setSelectedStationId}
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
