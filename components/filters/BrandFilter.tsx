"use client";

import { BRAND_NAMES } from "@/types";

interface BrandFilterProps {
  value: string | null;
  onChange: (brand: string | null) => void;
  availableBrands?: string[];
}

// E1G(E1), SKG(SK가스)는 LPG 충전소 — 휘발유/경유 필터에서 제외
const FUEL_BRANDS = Object.entries(BRAND_NAMES).filter(
  ([code]) => !["E1G", "SKG"].includes(code)
);

export default function BrandFilter({ value, onChange, availableBrands }: BrandFilterProps) {
  const options = availableBrands
    ? FUEL_BRANDS.filter(([code]) => availableBrands.includes(code))
    : FUEL_BRANDS;

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      className="h-9 px-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">정유사 전체</option>
      {options.map(([code, name]) => (
        <option key={code} value={code}>{name}</option>
      ))}
    </select>
  );
}
