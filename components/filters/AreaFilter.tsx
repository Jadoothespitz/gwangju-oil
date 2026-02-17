"use client";

import type { District } from "@/types";
import { AREAS, getAreasByDistrict } from "@/lib/gwangju/areas";
import { cn } from "@/lib/utils/cn";

interface AreaFilterProps {
  district: District | null;
  selected: string | null;
  onChange: (area: string | null) => void;
}

export default function AreaFilter({
  district,
  selected,
  onChange,
}: AreaFilterProps) {
  const areas = district
    ? getAreasByDistrict(district)
    : Object.values(AREAS);

  if (areas.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
      <button
        className={cn(
          "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors",
          !selected
            ? "bg-purple-600 text-white"
            : "bg-purple-50 text-purple-600 hover:bg-purple-100"
        )}
        onClick={() => onChange(null)}
      >
        전체 지구
      </button>
      {areas.map((area) => (
        <button
          key={area.name}
          className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors",
            selected === area.name
              ? "bg-purple-600 text-white"
              : "bg-purple-50 text-purple-600 hover:bg-purple-100"
          )}
          onClick={() => onChange(area.name)}
        >
          {area.name}
        </button>
      ))}
    </div>
  );
}
