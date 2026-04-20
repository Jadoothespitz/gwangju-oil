"use client";

import { useRef, useEffect } from "react";
import type { StationWithDistance, FuelType } from "@/types";
import StationCard from "./StationCard";

interface StationListProps {
  stations: StationWithDistance[];
  fuelType: FuelType;
  favoriteIds: Set<string>;
  selectedStationId?: string | null;
  isLoading: boolean;
  onFavoriteToggle: (id: string) => void;
  onStationSelect: (id: string) => void;
}

export default function StationList({
  stations,
  fuelType,
  favoriteIds,
  selectedStationId,
  isLoading,
  onFavoriteToggle,
  onStationSelect,
}: StationListProps) {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!selectedStationId) return;
    const el = cardRefs.current.get(selectedStationId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedStationId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 border-2 border-[#2046E5] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#3A3A44]">주유소 검색 중...</p>
        </div>
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-sm font-semibold text-[#3A3A44]">조건에 맞는 주유소가 없습니다.</p>
          <p className="text-xs text-[#C8C2B4] mt-1">필터 조건을 변경해보세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="station-list flex flex-col gap-2 p-3">
      <p className="text-[11px] font-bold text-[#3A3A44] px-1">
        {stations.length}개 주유소
      </p>
      {stations.map((station, index) => (
        <div
          key={station.uni_id}
          ref={(el) => {
            if (el) cardRefs.current.set(station.uni_id, el);
            else cardRefs.current.delete(station.uni_id);
          }}
        >
          <StationCard
            station={station}
            fuelType={fuelType}
            rank={index + 1}
            isFavorite={favoriteIds.has(station.uni_id)}
            isSelected={selectedStationId === station.uni_id}
            onFavoriteToggle={() => onFavoriteToggle(station.uni_id)}
            onClick={() => onStationSelect(station.uni_id)}
          />
        </div>
      ))}
    </div>
  );
}
