"use client";

import type { FuelType } from "@/types";

interface FuelTypeToggleProps {
  value: FuelType;
  onChange: (type: FuelType) => void;
}

export default function FuelTypeToggle({ value, onChange }: FuelTypeToggleProps) {
  return (
    <div className="flex bg-[#F3EFE5] rounded-full p-[3px] w-full">
      {(["gasoline", "diesel"] as FuelType[]).map((type) => {
        const active = value === type;
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`flex-1 py-2 text-sm font-bold rounded-full transition-all ${
              active
                ? "bg-white text-[#0E0E12] shadow-sm"
                : "text-[#3A3A44] hover:text-[#0E0E12]"
            }`}
          >
            {type === "gasoline" ? "휘발유" : "경유"}
          </button>
        );
      })}
    </div>
  );
}
