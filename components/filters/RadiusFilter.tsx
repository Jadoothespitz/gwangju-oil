"use client";

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

export default function RadiusFilter({ value, onChange }: RadiusFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-9 px-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {RADIUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
