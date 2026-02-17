"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import type { District, FuelType, SortBy } from "@/types";
import { useStations } from "@/lib/hooks/useStations";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import StationList from "@/components/station/StationList";
import DistrictFilter from "@/components/filters/DistrictFilter";
import AreaFilter from "@/components/filters/AreaFilter";
import FuelTypeToggle from "@/components/filters/FuelTypeToggle";
import SortSelector from "@/components/filters/SortSelector";
import { DISTRICT_INFO } from "@/lib/gwangju/districts";
import { AREAS } from "@/lib/gwangju/areas";

const KakaoMap = dynamic(() => import("@/components/map/KakaoMap"), {
  ssr: false,
  loading: () => (
    <div className="map-container w-full bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500 text-sm">지도 로딩 중...</p>
    </div>
  ),
});

export default function BrowsePage() {
  const [district, setDistrict] = useState<District | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [fuelType, setFuelType] = useState<FuelType>("gasoline");
  const [sortBy, setSortBy] = useState<SortBy>("price");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const { lat, lng, isFallback } = useGeolocation();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [showFallbackToast, setShowFallbackToast] = useState(false);

  useEffect(() => {
    if (isFallback) {
      setShowFallbackToast(true);
      const timer = setTimeout(() => setShowFallbackToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isFallback]);

  const { stations, isLoading } = useStations({
    district: district || undefined,
    area: area || undefined,
    fuelType,
    sortBy,
    lat,
    lng,
  });

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const mapCenter = useMemo(() => {
    if (area && AREAS[area]) return AREAS[area].center;
    if (district) return DISTRICT_INFO[district].center;
    return undefined;
  }, [district, area]);

  const mapLevel = useMemo(() => {
    if (area) return 5;     // 지구: 좁은 영역
    if (district) return 6; // 구: 중간 영역
    return undefined;       // 전체: 초기 bounds 유지
  }, [district, area]);

  // 구 변경 시 지구 초기화
  const handleDistrictChange = (d: District | null) => {
    setDistrict(d);
    setArea(null);
    setSelectedStationId(null);
  };

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Header />

      {/* 지도 */}
      <div className="relative shrink-0">
        <KakaoMap
          stations={stations}
          favoriteIds={favoriteSet}
          fuelType={fuelType}
          center={mapCenter}
          mapLevel={mapLevel}
          userLocation={lat && lng && !isFallback ? { lat, lng } : null}
          selectedStationId={selectedStationId}
          onStationSelect={setSelectedStationId}
        />
        {showFallbackToast && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 animate-fade-out">
            <div className="bg-black/60 text-white text-sm px-4 py-2 rounded-lg whitespace-nowrap">
              기본 위치를 광주시청으로 설정했습니다
            </div>
          </div>
        )}
      </div>

      {/* 필터 영역 */}
      <div className="bg-white border-b border-gray-200 px-3 py-2.5 space-y-2 shrink-0">
        {/* 구 필터 */}
        <DistrictFilter selected={district} onChange={handleDistrictChange} />

        {/* 지구 필터 */}
        <AreaFilter
          district={district}
          selected={area}
          onChange={(a) => {
            setArea(a);
            setSelectedStationId(null);
          }}
        />

        {/* 유종 + 정렬 */}
        <div className="flex items-center justify-between">
          <FuelTypeToggle value={fuelType} onChange={setFuelType} />
          <SortSelector
            value={sortBy}
            onChange={setSortBy}
            showDistance={!!(lat && lng)}
          />
        </div>
      </div>

      {/* 주유소 리스트 */}
      <div className="flex-1 min-h-0 bg-gray-50 overflow-y-auto pb-16">
        <StationList
          stations={stations}
          fuelType={fuelType}
          favoriteIds={favoriteSet}
          selectedStationId={selectedStationId}
          isLoading={isLoading}
          onFavoriteToggle={toggleFavorite}
          onStationSelect={setSelectedStationId}
        />
      </div>

      <BottomNav />
    </div>
  );
}
