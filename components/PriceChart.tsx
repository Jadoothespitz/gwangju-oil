"use client";

import { useState, useRef } from "react";
import useSWR from "swr";

type Snapshot = {
  date: string;
  national_gasoline: number | null;
  national_diesel: number | null;
  gwangju_gasoline: number | null;
  gwangju_diesel: number | null;
};

type Period = "1w" | "1m" | "3m" | "1y";
type FuelType = "gasoline" | "diesel";

const PERIODS: { label: string; value: Period }[] = [
  { label: "1주", value: "1w" },
  { label: "1달", value: "1m" },
  { label: "3달", value: "3m" },
  { label: "1년", value: "1y" },
];

const W = 220;
const H = 105;
const PAD = { top: 6, right: 6, bottom: 20, left: 44 };
const IW = W - PAD.left - PAD.right;
const IH = H - PAD.top - PAD.bottom;

function buildPath(points: [number, number][]): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
}

function fmtDateLabel(date: string, period: Period): string {
  if (period === "1y") return `${date.slice(2, 4)}/${date.slice(4, 6)}`;
  return `${date.slice(4, 6)}/${date.slice(6, 8)}`;
}

function fmtDateFull(date: string): string {
  return `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`;
}

// period별 X축 tick 인덱스 계산
function getXTickIndices(data: Snapshot[], period: Period): number[] {
  const n = data.length;
  if (n === 0) return [];
  if (period === "1w") {
    // 이틀 간격 → ~4개
    const ticks: number[] = [];
    for (let i = 0; i < n - 1; i += 2) ticks.push(i);
    ticks.push(n - 1);
    return ticks;
  }
  // 1m: 10일 간격 → ~4개, 3m: 25일 간격 → ~4-5개, 1y: 90일 간격 → ~5개
  const step = period === "1m" ? 10 : period === "3m" ? 25 : 90;
  const ticks: number[] = [];
  for (let i = 0; i < n - 1; i += step) ticks.push(i);
  ticks.push(n - 1);
  return ticks;
}

// Y축 4개 tick (min~max 균등 분할, 정수 반올림)
function getYTicks(minV: number, maxV: number): number[] {
  return Array.from({ length: 4 }, (_, i) => Math.round(minV + (i / 3) * (maxV - minV)));
}

function ChartSvg({
  data,
  gjKey,
  natKey,
  gjColor,
  period,
}: {
  data: Snapshot[];
  gjKey: keyof Snapshot;
  natKey: keyof Snapshot;
  gjColor: string;
  period: Period;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<{ idx: number; svgX: number } | null>(null);

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center text-xs text-[#C8C2B4]" style={{ height: 130 }}>
        데이터 없음
      </div>
    );
  }

  const allVals = data.flatMap(d =>
    [d[gjKey] as number | null, d[natKey] as number | null].filter((v): v is number => v != null)
  );
  if (allVals.length === 0) return null;

  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const range = maxV - minV || 1;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * IW;
  const toY = (v: number) => PAD.top + IH - ((v - minV) / range) * IH;

  const xTicks = getXTickIndices(data, period);
  const yTicks = getYTicks(minV, maxV);

  const gjPoints: [number, number][] = data
    .map((d, i) => d[gjKey] != null ? [toX(i), toY(d[gjKey] as number)] as [number, number] : null)
    .filter((p): p is [number, number] => p !== null);

  const natPoints: [number, number][] = data
    .map((d, i) => d[natKey] != null ? [toX(i), toY(d[natKey] as number)] as [number, number] : null)
    .filter((p): p is [number, number] => p !== null);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgMouseX = ((e.clientX - rect.left) / rect.width) * W;
    const innerX = svgMouseX - PAD.left;
    const rawIdx = Math.round((innerX / IW) * (data.length - 1));
    const idx = Math.max(0, Math.min(data.length - 1, rawIdx));
    setHovered({ idx, svgX: toX(idx) });
  };

  // 툴팁 데이터
  const hoverSnap = hovered ? data[hovered.idx] : null;
  const gjVal = hoverSnap ? (hoverSnap[gjKey] as number | null) : null;
  const natVal = hoverSnap ? (hoverSnap[natKey] as number | null) : null;

  // 툴팁 박스 크기 & 위치
  const TT_W = 100;
  const TT_H = natVal != null ? 42 : 30;
  const ttX = hovered
    ? (hovered.svgX + 10 + TT_W > W - PAD.right
        ? hovered.svgX - 10 - TT_W
        : hovered.svgX + 10)
    : 0;
  const ttY = PAD.top;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full cursor-crosshair select-none"
      style={{ height: 130 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
    >
      {/* Y 그리드 + 레이블 */}
      {yTicks.map((price, i) => {
        const y = toY(price);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="#EDE8E0" strokeWidth={1} />
            <text x={PAD.left - 3} y={y + 3.5} textAnchor="end" fontSize={8.5} fill="#C8C2B4">
              {price.toLocaleString()}
            </text>
          </g>
        );
      })}

      {/* X 날짜 tick */}
      {xTicks.map((idx) => (
        <text key={idx} x={toX(idx)} y={H - 2} textAnchor="middle" fontSize={8.5} fill="#C8C2B4">
          {fmtDateLabel(data[idx].date, period)}
        </text>
      ))}

      {/* 전국선 (점선) */}
      {natPoints.length > 1 && (
        <path d={buildPath(natPoints)} fill="none" stroke="#C8C2B4" strokeWidth={1.2}
          strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2" />
      )}

      {/* 광주선 */}
      {gjPoints.length > 1 && (
        <path d={buildPath(gjPoints)} fill="none" stroke={gjColor} strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* 마지막 점 */}
      {!hovered && gjPoints.length > 0 && (() => {
        const last = gjPoints[gjPoints.length - 1];
        return <circle cx={last[0]} cy={last[1]} r={2.5} fill={gjColor} />;
      })()}

      {/* 호버 오버레이 */}
      {hovered && hoverSnap && (
        <g>
          <line
            x1={hovered.svgX} y1={PAD.top}
            x2={hovered.svgX} y2={PAD.top + IH}
            stroke="#C8C2B4" strokeWidth={0.8} strokeDasharray="2 2"
          />
          {/* 광주 점 */}
          {gjVal != null && (
            <circle cx={hovered.svgX} cy={toY(gjVal)} r={3}
              fill={gjColor} stroke="white" strokeWidth={1.5} />
          )}
          {/* 전국 점 */}
          {natVal != null && (
            <circle cx={hovered.svgX} cy={toY(natVal)} r={2}
              fill="#C8C2B4" stroke="white" strokeWidth={1} />
          )}

          {/* 툴팁 박스 */}
          <g transform={`translate(${ttX}, ${ttY})`}>
            <rect width={TT_W} height={TT_H} rx={6} fill="white"
              stroke="#E8E3D8" strokeWidth={0.8}
              style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.08))" }}
            />
            {/* 날짜 */}
            <text x={6} y={10} fontSize={8} fill="#C8C2B4">
              {fmtDateFull(hoverSnap.date)}
            </text>
            {/* 광주 값 */}
            {gjVal != null && (
              <text x={6} y={23} fontSize={10} fontWeight="700" fill={gjColor}>
                {`광주 ${gjVal.toLocaleString()}`}
              </text>
            )}
            {natVal != null && (
              <text x={6} y={35} fontSize={8.5} fill="#C8C2B4">
                {`전국 ${natVal.toLocaleString()}`}
              </text>
            )}
          </g>
        </g>
      )}
    </svg>
  );
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function PriceChart() {
  const [period, setPeriod] = useState<Period>("1m");
  const [fuel, setFuel] = useState<FuelType>("gasoline");

  const { data, isLoading } = useSWR<Snapshot[]>(
    `/api/prices/history?period=${period}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const gjKey: keyof Snapshot = fuel === "gasoline" ? "gwangju_gasoline" : "gwangju_diesel";
  const natKey: keyof Snapshot = fuel === "gasoline" ? "national_gasoline" : "national_diesel";
  const gjColor = fuel === "gasoline" ? "#2046E5" : "#00B372";

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3D8] overflow-hidden">
      {/* 헤더 */}
      <div className="bg-[#EEF1FF] px-4 py-3 border-b border-[#D8DEFF] flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#0E0E12]">유가 추이</h2>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                period === p.value
                  ? "bg-[#2046E5] text-white"
                  : "text-[#2046E5] hover:bg-[#D8DEFF]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 pb-1">
        {/* 유종 토글 + 범례 */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setFuel("gasoline")}
            className={`text-xs px-3 py-0.5 rounded-full border font-bold transition-colors ${
              fuel === "gasoline"
                ? "bg-[#2046E5] text-white border-[#2046E5]"
                : "text-[#3A3A44] border-[#E8E3D8] hover:bg-[#F3EFE5]"
            }`}
          >
            휘발유
          </button>
          <button
            onClick={() => setFuel("diesel")}
            className={`text-xs px-3 py-0.5 rounded-full border font-bold transition-colors ${
              fuel === "diesel"
                ? "bg-[#00B372] text-white border-[#00B372]"
                : "text-[#3A3A44] border-[#E8E3D8] hover:bg-[#F3EFE5]"
            }`}
          >
            경유
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1">
              <svg width="16" height="6">
                <line x1="0" y1="3" x2="16" y2="3" stroke={gjColor} strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-[10px] text-[#3A3A44]">광주</span>
            </span>
            <span className="flex items-center gap-1">
              <svg width="16" height="6">
                <line x1="0" y1="3" x2="16" y2="3" stroke="#C8C2B4" strokeWidth="1.5"
                  strokeDasharray="3 2" strokeLinecap="round" />
              </svg>
              <span className="text-[10px] text-[#3A3A44]">전국</span>
            </span>
          </div>
        </div>

        {/* 차트 */}
        {isLoading ? (
          <div className="animate-pulse bg-[#F3EFE5] rounded-xl" style={{ height: 130 }} />
        ) : data && data.length >= 2 ? (
          <ChartSvg data={data} gjKey={gjKey} natKey={natKey} gjColor={gjColor} period={period} />
        ) : (
          <div className="flex items-center justify-center text-xs text-[#C8C2B4]" style={{ height: 130 }}>
            데이터 없음
          </div>
        )}
      </div>
      <p className="text-[10px] text-[#C8C2B4] px-4 pb-2.5">단위: 원/L · 출처: 오피넷</p>
    </div>
  );
}
