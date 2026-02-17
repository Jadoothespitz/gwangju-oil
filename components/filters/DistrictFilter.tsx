"use client";

import type { District } from "@/types";
import { DISTRICTS } from "@/types";
import { cn } from "@/lib/utils/cn";

interface DistrictFilterProps {
  selected: District | null;
  onChange: (district: District | null) => void;
}

export default function DistrictFilter({
  selected,
  onChange,
}: DistrictFilterProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
      <button
        className={cn(
          "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
          !selected
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        )}
        onClick={() => onChange(null)}
      >
        전체
      </button>
      {DISTRICTS.map((d) => (
        <button
          key={d}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
            selected === d
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
          onClick={() => onChange(d)}
        >
          {d}
        </button>
      ))}
    </div>
  );
}
