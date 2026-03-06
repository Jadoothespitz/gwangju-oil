"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { District, FuelType, SortBy } from "@/types";
import { useStations } from "@/lib/hooks/useStations";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import StationList from "@/components/station/StationList";
import DistrictFilter from "@/components/filters/DistrictFilter";
import FuelTypeToggle from "@/components/filters/FuelTypeToggle";
import SortSelector from "@/components/filters/SortSelector";
import { DISTRICT_INFO } from "@/lib/gwangju/districts";
import { cn } from "@/lib/utils/cn";

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
  const [fuelType, setFuelType] = useState<FuelType>("gasoline");
  const [sortBy, setSortBy] = useState<SortBy>("price");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    fuelType,
    sortBy,
    lat,
    lng,
  });

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const mapCenter = useMemo(() => {
    if (district) return DISTRICT_INFO[district].center;
    return undefined;
  }, [district]);

  const mapLevel = useMemo(() => {
    if (district) return 6;
    return undefined;
  }, [district]);

  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stations;
    const q = searchQuery.trim().toLowerCase();
    return stations.filter((s) => s.name.toLowerCase().includes(q));
  }, [stations, searchQuery]);

  const handleDistrictChange = (d: District | null) => {
    setDistrict(d);
    setSelectedStationId(null);
    setSearchQuery("");
  };

  const handleSearchToggle = () => {
    if (searchOpen) setSearchQuery("");
    setSearchOpen((prev) => !prev);
  };

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Header />

      {/* 지도 */}
      <div className="relative shrink-0">
        <KakaoMap
          stations={filteredStations}
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
              기본 위치를 광주광역시청으로 설정했다요
            </div>
          </div>
        )}
      </div>

      {/* 필터 영역 */}
      <div className="bg-white border-b border-gray-200 px-3 py-2.5 space-y-2 shrink-0">
        {/* 구 필터 + 검색 버튼 */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <DistrictFilter selected={district} onChange={handleDistrictChange} />
          </div>
          <button
            onClick={handleSearchToggle}
            className={cn(
              "shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors",
              searchOpen
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
            aria-label="주유소 이름 검색"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </button>
        </div>

        {/* 검색 입력창 */}
        {searchOpen && (
          <div className="flex items-center gap-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="주유소 이름 검색"
              className="flex-1 h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              aria-label="검색 닫기"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

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
          stations={filteredStations}
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
