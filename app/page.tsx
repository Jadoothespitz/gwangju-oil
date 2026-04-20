"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import type { District, FuelType, SortBy } from "@/types";
import type { CardType } from "@/lib/db/queries/stationQueries";
import { useStations } from "@/lib/hooks/useStations";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import StationList from "@/components/station/StationList";
import SortSelector from "@/components/filters/SortSelector";
import FilterSheet from "@/components/filters/FilterSheet";
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

type DistrictOrNearby = District | "nearby" | null;

export default function BrowsePage() {
  const [district, setDistrict] = useState<DistrictOrNearby>(null);
  const [radius, setRadius] = useState(3000);
  const [fuelType, setFuelType] = useState<FuelType>(() => {
    if (typeof window === "undefined") return "gasoline";
    const saved = localStorage.getItem("preferredFuelType");
    return saved === "diesel" ? "diesel" : "gasoline";
  });
  const [sortBy, setSortBy] = useState<SortBy>("price");
  const [brand, setBrand] = useState<string | null>(null);
  const [cardType, setCardType] = useState<CardType>("all");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { lat, lng, isFallback, loading: locationLoading } = useGeolocation();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [showFallbackToast, setShowFallbackToast] = useState(false);

  const isNearby = district === "nearby";

  useEffect(() => {
    if (isFallback && isNearby) {
      setShowFallbackToast(true);
      const timer = setTimeout(() => setShowFallbackToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isFallback, isNearby]);

  const { data: brandsData } = useSWR<{ brands: string[] }>(
    "/api/stations/brands",
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 86400_000 }
  );

  const { stations, isLoading } = useStations({
    district: isNearby ? undefined : (district ?? undefined),
    fuelType,
    sortBy,
    brand,
    cardType,
    lat,
    lng,
    radius: isNearby ? radius : undefined,
  });

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const mapCenter = useMemo(() => {
    if (isNearby && lat && lng) return { lat, lng };
    if (district && district !== "nearby") return DISTRICT_INFO[district].center;
    return undefined;
  }, [district, isNearby, lat, lng]);

  const mapLevel = useMemo(() => {
    if (district) return 6;
    return undefined;
  }, [district]);

  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stations;
    const q = searchQuery.trim().toLowerCase();
    return stations.filter((s) => s.name.toLowerCase().includes(q));
  }, [stations, searchQuery]);

  const handleDistrictChange = (d: District | "nearby" | null) => {
    setDistrict(d);
    setSelectedStationId(null);
    setSearchQuery("");
    if (d === "nearby") {
      setSortBy("distance");
    } else if (sortBy === "distance") {
      setSortBy("price");
    }
  };

  const handleFuelTypeChange = (type: FuelType) => {
    setFuelType(type);
    localStorage.setItem("preferredFuelType", type);
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

      {/* 모바일: 세로 (지도 위 + 필터/리스트 아래) / 데스크탑: 가로 (리스트 왼쪽 + 지도 오른쪽) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* 지도 — 모바일: 상단 고정 / 데스크탑: order-2로 오른쪽 */}
        <div className="relative shrink-0 lg:order-2 lg:flex-1">
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

        {/* 필터 + 리스트 — 모바일: 나머지 / 데스크탑: order-1로 왼쪽 고정폭 */}
        <div className="flex flex-col flex-1 lg:flex-none lg:w-[400px] lg:order-1 overflow-hidden">

          {/* 위치 로딩 상태 (내 주변 모드) */}
          {isNearby && locationLoading && (
            <div className="bg-white border-b border-[#E8E3D8] px-3 py-2 shrink-0">
              <p className="text-xs text-[#2046E5] flex items-center gap-1">
                <span className="w-3 h-3 border-2 border-[#2046E5] border-t-transparent rounded-full animate-spin inline-block" />
                위치를 가져오는 중...
              </p>
            </div>
          )}

          {/* 필터 영역 */}
          <div className="bg-white border-b border-[#E8E3D8] px-3 py-2 shrink-0">
            <div className="flex items-center gap-2">
              {/* 필터 버튼 */}
              {(() => {
                const activeCount = [
                  district !== null,
                  cardType !== "all",
                  brand !== null,
                ].filter(Boolean).length;
                return (
                  <button
                    onClick={() => setFilterSheetOpen(true)}
                    className={cn(
                      "flex items-center gap-1.5 h-9 px-3 text-sm border rounded-xl transition-colors shrink-0",
                      activeCount > 0
                        ? "border-[#2046E5] text-[#2046E5] bg-[#EEF1FF]"
                        : "border-[#E8E3D8] text-[#3A3A44] bg-white"
                    )}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
                    </svg>
                    필터
                    {activeCount > 0 && (
                      <span className="w-4 h-4 text-[11px] font-bold bg-[#2046E5] text-white rounded-full flex items-center justify-center">
                        {activeCount}
                      </span>
                    )}
                  </button>
                );
              })()}

              <div className="flex-1" />

              <SortSelector
                value={sortBy}
                onChange={setSortBy}
                showDistance={!!(lat && lng)}
              />

              {/* 검색 버튼 */}
              <button
                onClick={handleSearchToggle}
                className={cn(
                  "shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                  searchOpen
                    ? "bg-[#2046E5] text-white"
                    : "bg-[#F3EFE5] text-[#3A3A44] hover:bg-[#E8E3D8]"
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
              <div className="flex items-center gap-2 mt-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="주유소 이름 검색"
                  className="flex-1 h-9 px-3 text-sm border border-[#E8E3D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2046E5] focus:border-transparent"
                />
                <button
                  onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[#F3EFE5] text-[#3A3A44] hover:bg-[#E8E3D8]"
                  aria-label="검색 닫기"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* 주유소 리스트 */}
          <div className="flex-1 min-h-0 bg-[#FAF7F0] overflow-y-auto pb-16">
            <StationList
              stations={filteredStations}
              fuelType={fuelType}
              favoriteIds={favoriteSet}
              selectedStationId={selectedStationId}
              isLoading={isLoading || (isNearby && locationLoading)}
              onFavoriteToggle={toggleFavorite}
              onStationSelect={setSelectedStationId}
            />
          </div>

        </div>
      </div>

      <BottomNav />

      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        district={district}
        onDistrictChange={handleDistrictChange}
        fuelType={fuelType}
        onFuelTypeChange={handleFuelTypeChange}
        cardType={cardType}
        onCardTypeChange={setCardType}
        brand={brand}
        onBrandChange={setBrand}
        availableBrands={brandsData?.brands}
        radius={radius}
        onRadiusChange={setRadius}
        isNearby={isNearby}
      />
    </div>
  );
}
