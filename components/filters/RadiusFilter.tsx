"use client";

import { cn } from "@/lib/utils/cn";

const RADIUS_OPTIONS = [
  { value: 1000, label: "1km" },
  { value: 3000, label: "3km" },
  { value: 5000, label: "5km" },
  { value: 10000, label: "10km" },
];

interface RadiusFilterProps {
  value: number;
  onChange: (radius: number) => void;
}

export default function RadiusFilter({
  value,
  onChange,
}: RadiusFilterProps) {
  return (
    <div className="flex gap-1.5">
      {RADIUS_OPTIONS.map((option) => (
        <button
          key={option.value}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            value === option.value
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
