"use client";

import type { FuelType } from "@/types";
import { cn } from "@/lib/utils/cn";

interface FuelTypeToggleProps {
  value: FuelType;
  onChange: (type: FuelType) => void;
}

export default function FuelTypeToggle({
  value,
  onChange,
}: FuelTypeToggleProps) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
      <button
        className={cn(
          "px-3 py-1 rounded-md text-xs font-medium transition-colors",
          value === "gasoline"
            ? "bg-white text-blue-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        )}
        onClick={() => onChange("gasoline")}
      >
        휘발유
      </button>
      <button
        className={cn(
          "px-3 py-1 rounded-md text-xs font-medium transition-colors",
          value === "diesel"
            ? "bg-white text-blue-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        )}
        onClick={() => onChange("diesel")}
      >
        경유
      </button>
    </div>
  );
}
