"use client";

import type { SortBy } from "@/types";
import { cn } from "@/lib/utils/cn";

interface SortSelectorProps {
  value: SortBy;
  onChange: (sort: SortBy) => void;
  showDistance?: boolean;
}

export default function SortSelector({
  value,
  onChange,
  showDistance = true,
}: SortSelectorProps) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
      <button
        className={cn(
          "px-3 py-1 rounded-md text-xs font-medium transition-colors",
          value === "price"
            ? "bg-white text-blue-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        )}
        onClick={() => onChange("price")}
      >
        가격순
      </button>
      {showDistance && (
        <button
          className={cn(
            "px-3 py-1 rounded-md text-xs font-medium transition-colors",
            value === "distance"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
          onClick={() => onChange("distance")}
        >
          거리순
        </button>
      )}
    </div>
  );
}
