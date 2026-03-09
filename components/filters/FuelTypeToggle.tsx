"use client";

import type { FuelType } from "@/types";

interface FuelTypeToggleProps {
  value: FuelType;
  onChange: (type: FuelType) => void;
}

export default function FuelTypeToggle({ value, onChange }: FuelTypeToggleProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FuelType)}
      className="h-9 px-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="gasoline">휘발유</option>
      <option value="diesel">경유</option>
    </select>
  );
}
