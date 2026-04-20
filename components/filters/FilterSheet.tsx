"use client";

import type { District, FuelType } from "@/types";
import type { CardType } from "@/lib/db/queries/stationQueries";
import DistrictFilter from "./DistrictFilter";
import FuelTypeToggle from "./FuelTypeToggle";
import CardTypeFilter from "./CardTypeFilter";
import BrandFilter from "./BrandFilter";
import RadiusFilter from "./RadiusFilter";

type DistrictOrNearby = District | "nearby" | null;

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  district: DistrictOrNearby;
  onDistrictChange: (d: DistrictOrNearby) => void;
  fuelType: FuelType;
  onFuelTypeChange: (ft: FuelType) => void;
  cardType: CardType;
  onCardTypeChange: (ct: CardType) => void;
  brand: string | null;
  onBrandChange: (b: string | null) => void;
  availableBrands?: string[];
  radius: number;
  onRadiusChange: (r: number) => void;
  isNearby: boolean;
}

export default function FilterSheet({
  open,
  onClose,
  district,
  onDistrictChange,
  fuelType,
  onFuelTypeChange,
  cardType,
  onCardTypeChange,
  brand,
  onBrandChange,
  availableBrands,
  radius,
  onRadiusChange,
  isNearby,
}: FilterSheetProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-[55] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[60] bg-[#FAF7F0] rounded-t-3xl shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#C8C2B4] rounded-full opacity-60" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E3D8]">
          <div>
            <p className="text-[11px] font-bold text-[#2046E5] tracking-wider uppercase">FILTER</p>
            <h2 className="text-base font-bold text-[#0E0E12] mt-0.5">어떤 기름집 찾을까?</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F3EFE5] text-[#3A3A44] hover:bg-[#E8E3D8] transition-colors"
            aria-label="닫기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter sections */}
        <div className="px-5 py-4 space-y-5 [&_select]:w-full [&_select]:block">
          <div>
            <p className="text-xs font-bold text-[#3A3A44] mb-2 uppercase tracking-wide">지역</p>
            <DistrictFilter selected={district} onChange={onDistrictChange} />
          </div>
          {isNearby && (
            <div>
              <p className="text-xs font-bold text-[#3A3A44] mb-2 uppercase tracking-wide">반경</p>
              <RadiusFilter value={radius} onChange={onRadiusChange} />
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-[#3A3A44] mb-2 uppercase tracking-wide">유종</p>
            <FuelTypeToggle value={fuelType} onChange={onFuelTypeChange} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#3A3A44] mb-2 uppercase tracking-wide">상품권</p>
            <CardTypeFilter value={cardType} onChange={onCardTypeChange} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#3A3A44] mb-2 uppercase tracking-wide">정유사</p>
            <BrandFilter value={brand} onChange={onBrandChange} availableBrands={availableBrands} />
          </div>
        </div>

        {/* Apply button */}
        <div className="px-5 pb-8 pt-2 border-t border-[#E8E3D8]">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-[#2046E5] hover:bg-[#1733B8] text-white text-sm font-bold rounded-2xl transition-colors"
          >
            적용하기
          </button>
        </div>
      </div>
    </>
  );
}
