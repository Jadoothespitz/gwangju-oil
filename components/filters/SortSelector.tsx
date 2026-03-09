"use client";

import type { SortBy } from "@/types";

interface SortSelectorProps {
  value: SortBy;
  onChange: (sort: SortBy) => void;
  showDistance?: boolean;
}

export default function SortSelector({ value, onChange, showDistance = true }: SortSelectorProps) {
  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => onChange("price")}
        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
          value === "price"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        가격순
      </button>
      {showDistance && (
        <button
          onClick={() => onChange("distance")}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            value === "distance"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          거리순
        </button>
      )}
    </div>
  );
}
