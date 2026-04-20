"use client";

import type { CardType } from "@/lib/db/queries/stationQueries";

interface CardTypeFilterProps {
  value: CardType;
  onChange: (cardType: CardType) => void;
}

export default function CardTypeFilter({ value, onChange }: CardTypeFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CardType)}
      className="h-9 px-2 text-sm border border-[#E8E3D8] rounded-xl bg-white text-[#0E0E12] focus:outline-none focus:ring-2 focus:ring-[#2046E5] focus:border-transparent"
    >
      <option value="all">상품권 전체</option>
      <option value="sangsaeng">광주상생카드</option>
      <option value="onnuri">온누리상품권</option>
    </select>
  );
}
