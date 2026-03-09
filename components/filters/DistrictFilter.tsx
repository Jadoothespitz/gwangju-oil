"use client";

import type { District } from "@/types";
import { DISTRICTS } from "@/types";

type DistrictValue = District | "nearby" | "";

interface DistrictFilterProps {
  selected: District | "nearby" | null;
  onChange: (district: District | "nearby" | null) => void;
}

export default function DistrictFilter({ selected, onChange }: DistrictFilterProps) {
  const value: DistrictValue = selected ?? "";

  return (
    <select
      value={value}
      onChange={(e) => {
        const v = e.target.value as DistrictValue;
        onChange(v === "" ? null : v);
      }}
      className="h-9 px-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="nearby">내 주변</option>
      <option value="">구 전체</option>
      {DISTRICTS.map((d) => (
        <option key={d} value={d}>{d}</option>
      ))}
    </select>
  );
}
