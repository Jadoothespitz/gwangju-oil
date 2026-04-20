"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import BottomNav from "@/components/layout/BottomNav";
import LabMap from "@/components/map/LabMap";
import type { LabMapStation } from "@/components/map/LabMap";
import type { Station } from "@/types";
import { formatDistance } from "@/lib/utils/formatPrice";
import { cn } from "@/lib/utils/cn";

const BRAND_STYLES: Record<string, { background: string; color: string }> = {
  SKE: { background: "#FFE5E9", color: "#EA002C" },
  GSC: { background: "#003087", color: "#00FF7F" },
  HDO: { background: "#00A86B", color: "#004B9B" },
  SOL: { background: "#FFF8D6", color: "#005F28" },
  ALT: { background: "#FFF0E5", color: "#F06400" },
  RTO: { background: "#F3F0E8", color: "#3A3A44" },
  ETC: { background: "#F3F0E8", color: "#3A3A44" },
};

interface AddressSuggestion {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface LabResult {
  station: Station;
  distanceM: number;
  travelKm: number;
  tripType: "one-way" | "round-trip";
  fuelType: "gasoline" | "diesel";
  pricePerL: number;
  totalFuelL: number;
  travelFuelL: number;
  netFuelL: number;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <div className="flex bg-[#F3EFE5] rounded-full p-[3px]">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "flex-1 py-2 rounded-full text-[13px] font-bold transition-all",
            value === opt
              ? "bg-white text-[#0E0E12] shadow-sm"
              : "text-[rgba(14,14,18,0.55)]"
          )}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

// 1위 결과 카드 (그라디언트)
function WinnerCard({ result }: { result: LabResult }) {
  const dist = formatDistance(result.distanceM);
  return (
    <div
      className="rounded-[20px] p-[18px] relative overflow-hidden text-white"
      style={{ background: "linear-gradient(135deg, #2046E5 0%, #1733B8 100%)" }}
    >
      {/* 장식 원 */}
      <div
        className="absolute"
        style={{ right: -10, top: -10, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,207,51,0.2)" }}
      />

      <div className="flex items-center gap-2 mb-2.5 relative">
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FFCF33] text-[#0E0E12] tracking-[0.3px]">
          🥇 1위
        </span>
        <span className="text-[11px] font-semibold text-white/70">
          {result.station.district} · {dist}
        </span>
      </div>

      <p className="text-[17px] font-bold relative mb-3.5" style={{ letterSpacing: "-0.3px" }}>
        {result.station.name}
      </p>

      <div className="flex gap-5 relative">
        <div>
          <p className="text-[10px] font-semibold text-white/60 mb-0.5">순 주유량</p>
          <div className="flex items-baseline gap-0.5">
            <span
              className="text-[26px] font-extrabold leading-none"
              style={{
                fontFamily: "'Paperlogy', 'Pretendard', sans-serif",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-1px",
              }}
            >
              {result.netFuelL.toFixed(2)}
            </span>
            <span className="text-[11px] font-semibold opacity-75">L</span>
          </div>
        </div>
        <div className="w-px bg-white/20" />
        <div>
          <p className="text-[10px] font-semibold text-white/60 mb-0.5">리터당</p>
          <div className="flex items-baseline gap-0.5">
            <span
              className="text-[26px] font-extrabold leading-none"
              style={{
                fontFamily: "'Paperlogy', 'Pretendard', sans-serif",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-1px",
              }}
            >
              {result.pricePerL.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold opacity-75">원</span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 relative text-[11px] text-white/85" style={{ borderTop: "1px dashed rgba(255,255,255,0.25)" }}>
        총 주유량 <b>{result.totalFuelL.toFixed(2)}L</b> ·{" "}
        이동 연료 <b className="text-[#FFCF33]">-{result.travelFuelL.toFixed(2)}L</b> 소모
      </div>
    </div>
  );
}

// 2~3위 결과 카드
function RankCard({ result, rank }: { result: LabResult; rank: number }) {
  const brandStyle = BRAND_STYLES[result.station.brand] || BRAND_STYLES.ETC;
  const dist = formatDistance(result.distanceM);

  return (
    <div className="bg-white rounded-[16px] border border-[#E8E3D8] p-3.5 flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-[10px] bg-[#F3EFE5] text-[#3A3A44] flex items-center justify-center font-extrabold text-[13px] shrink-0"
        style={{ fontFamily: "'Paperlogy', 'Pretendard', sans-serif" }}
      >
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
            style={brandStyle}
          >
            {result.station.brandName}
          </span>
          <span className="text-sm font-bold text-[#0E0E12] truncate">{result.station.name}</span>
        </div>
        <p className="text-[11px] text-[#3A3A44]">
          {result.station.district} · {dist} · {result.pricePerL.toLocaleString()}원/L
        </p>
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-baseline gap-0.5 justify-end">
          <span
            className="text-[18px] font-extrabold text-[#2046E5] leading-none"
            style={{
              fontFamily: "'Paperlogy', 'Pretendard', sans-serif",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.5px",
            }}
          >
            {result.netFuelL.toFixed(2)}
          </span>
          <span className="text-[10px] font-semibold text-[#3A3A44]">L</span>
        </div>
        <p className="text-[10px] text-[#3A3A44] mt-0.5">순 주유량</p>
      </div>
    </div>
  );
}

export default function LabPage() {
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [efficiency, setEfficiency] = useState("");
  const [budget, setBudget] = useState("");
  const [fuelType, setFuelType] = useState<"gasoline" | "diesel">("gasoline");
  const [tripType, setTripType] = useState<"one-way" | "round-trip">("round-trip");
  const [isLocating, setIsLocating] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<LabResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEfficiency(localStorage.getItem("lab_efficiency") || "");
    setBudget(localStorage.getItem("lab_budget") || "");
    const savedFuel = localStorage.getItem("lab_fuelType");
    if (savedFuel === "gasoline" || savedFuel === "diesel") setFuelType(savedFuel);
    const saved = localStorage.getItem("lab_tripType");
    if (saved === "one-way" || saved === "round-trip") setTripType(saved);
  }, []);

  useEffect(() => { if (efficiency) localStorage.setItem("lab_efficiency", efficiency); }, [efficiency]);
  useEffect(() => { if (budget) localStorage.setItem("lab_budget", budget); }, [budget]);
  useEffect(() => { localStorage.setItem("lab_fuelType", fuelType); }, [fuelType]);
  useEffect(() => { localStorage.setItem("lab_tripType", tripType); }, [tripType]);

  // 주소 자동완성 debounce
  useEffect(() => {
    if (!address || address.length < 2 || coords) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-address?query=${encodeURIComponent(address)}`);
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch { setSuggestions([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [address, coords]);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelectSuggestion = useCallback((s: AddressSuggestion) => {
    setAddress(s.name !== s.address ? `${s.name} (${s.address})` : s.address);
    setCoords({ lat: s.lat, lng: s.lng });
    setSuggestions([]);
  }, []);

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) { setError("이 브라우저는 위치 감지를 지원하지 않습니다."); return; }
    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        try {
          const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
          const data = await res.json();
          setAddress(data.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } catch {
          setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
        setIsLocating(false);
      },
      () => { setIsLocating(false); setError("위치를 가져오지 못했습니다. 주소를 직접 입력해 주세요."); },
      { timeout: 10000 }
    );
  }, []);

  const handleCalculate = useCallback(async () => {
    setError(null);
    if (!address && !coords) { setError("출발지를 입력해 주세요."); return; }
    const effNum = parseFloat(efficiency);
    const budgetNum = parseInt(budget);
    if (!effNum || effNum <= 0) { setError("연비를 올바르게 입력해 주세요. (예: 12.5)"); return; }
    if (!budgetNum || budgetNum <= 0) { setError("주유 금액을 올바르게 입력해 주세요. (예: 60000)"); return; }
    setIsCalculating(true);
    try {
      let resolvedCoords = coords;
      if (!resolvedCoords && address) {
        const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
        const geoData = await geoRes.json();
        if (!geoRes.ok || !geoData.lat) { setError("주소를 찾을 수 없습니다. 더 자세하게 입력해 주세요. (예: 광주 북구 용봉동)"); return; }
        resolvedCoords = { lat: geoData.lat, lng: geoData.lng };
        setCoords(resolvedCoords);
      }
      const res = await fetch(
        `/api/lab/calculate?lat=${resolvedCoords!.lat}&lng=${resolvedCoords!.lng}&efficiency=${effNum}&budget=${budgetNum}&tripType=${tripType}&fuelType=${fuelType}`
      );
      const data = await res.json();
      if (!res.ok) { setError(data.error || "계산 중 오류가 발생했습니다."); return; }
      setResults(data.results);
      setSelectedStationId(null);
    } catch {
      setError("서버와 통신하는 중 오류가 발생했습니다.");
    } finally {
      setIsCalculating(false);
    }
  }, [address, coords, efficiency, budget, tripType, fuelType]);

  const mapStations = useMemo<LabMapStation[]>(
    () =>
      results?.map((r, i) => ({
        id: r.station.uni_id,
        name: r.station.name,
        lat: r.station.location.coordinates[1],
        lng: r.station.location.coordinates[0],
        rank: i + 1,
        netFuelL: r.netFuelL,
      })) ?? [],
    [results]
  );

  return (
    <div className="flex flex-col h-dvh overflow-hidden">

      {/* 커스텀 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E8E3D8]">
        <div className="flex items-center justify-between h-12 px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0E0E12] rounded-lg flex items-center justify-center shrink-0">
              <svg width="14" height="17" viewBox="0 0 14 18" fill="none">
                <path d="M5 1v5L1.5 14a2 2 0 001.8 2.8h7.4a2 2 0 001.8-2.8L9 6V1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 11h8" stroke="#FFCF33" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="5.5" cy="13" r="0.8" fill="#FFCF33" />
                <circle cx="8.5" cy="14" r="0.6" fill="#FFCF33" />
              </svg>
            </div>
            <span className="text-sm font-bold text-[#0E0E12] tracking-tight">실험실</span>
          </div>
          <span
            className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border tracking-[0.3px]"
            style={{ background: "rgba(255,207,51,0.2)", color: "#8A6A00", borderColor: "#FFCF33" }}
          >
            BETA
          </span>
        </div>
      </header>

      {/* 모바일: 세로 / 데스크탑: 가로 2열 */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* 지도 — 모바일: 상단 / 데스크탑: order-2 오른쪽 */}
        <div className="h-48 shrink-0 lg:h-auto lg:flex-1 lg:order-2">
          <LabMap origin={coords} stations={mapStations} selectedId={selectedStationId} />
        </div>

        {/* 폼 + 결과 — 모바일: 나머지 / 데스크탑: order-1 왼쪽 */}
        <div className="flex-1 lg:flex-none lg:w-[420px] overflow-y-auto pb-16 lg:order-1 bg-[#FAF7F0]">
          <div className="max-w-lg mx-auto px-4 py-5 space-y-4 lg:max-w-none">

            {/* Hero */}
            <div>
              <p className="text-xs font-bold text-[#2046E5] tracking-[0.3px] mb-1">
                LAB · 경제적 주유소 찾기
              </p>
              <h2
                className="font-extrabold text-[26px] text-[#0E0E12] leading-[1.1] mb-2"
                style={{ fontFamily: "'Paperlogy', 'Pretendard', sans-serif", letterSpacing: "-0.9px" }}
              >
                최솟값 말고,<br />
                <span className="text-[#2046E5]">진짜 이득인</span> 기름집
              </h2>
              <p className="text-xs text-[rgba(14,14,18,0.55)] leading-[1.5]">
                연비와 이동 거리를 반영해, <b className="text-[#0E0E12]">순 주유량</b>이 가장 많은 주유소를 알려드려요.
              </p>
            </div>

            {/* 폼 카드 */}
            <div className="bg-white rounded-[20px] border border-[#E8E3D8] p-[18px] space-y-3.5">

              {/* 출발지 */}
              <div>
                <p className="text-[11px] font-bold text-[rgba(14,14,18,0.55)] mb-1.5 tracking-[0.2px]">출발지</p>
                <div className="relative" ref={suggestionRef}>
                  <div
                    className="flex items-center gap-2 px-3 py-[11px] rounded-[12px] bg-[#F3EFE5]"
                  >
                    <svg className="w-3.5 h-3.5 text-[#2046E5] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinejoin="round" d="M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12z" />
                      <circle cx="12" cy="9.5" r="2.5" />
                    </svg>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => { setAddress(e.target.value); setCoords(null); }}
                      placeholder="예: 광주 이마트, 북구 용봉로 77"
                      className="flex-1 text-sm font-semibold text-[#0E0E12] bg-transparent focus:outline-none placeholder:text-[rgba(14,14,18,0.35)] placeholder:font-normal min-w-0"
                    />
                    <button
                      onClick={handleGeolocate}
                      disabled={isLocating}
                      className="shrink-0 text-[10px] font-extrabold text-[#2046E5] bg-[#EEF1FF] px-2 py-1 rounded-full disabled:opacity-50"
                    >
                      {isLocating ? "감지중" : "내 위치"}
                    </button>
                  </div>

                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E8E3D8] rounded-xl shadow-lg z-50 overflow-hidden">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s); }}
                          className="w-full text-left px-4 py-3 hover:bg-[#FAF7F0] transition-colors border-b border-[#F3EFE5] last:border-b-0"
                        >
                          <p className="text-sm font-semibold text-[#0E0E12] truncate">{s.name}</p>
                          {s.address && s.address !== s.name && (
                            <p className="text-xs text-[#3A3A44] truncate mt-0.5">{s.address}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 연비 + 금액 */}
              <div className="flex gap-2.5">
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-[rgba(14,14,18,0.55)] mb-1.5 tracking-[0.2px]">내 차 연비</p>
                  <div className="flex items-baseline gap-1 px-3 py-[11px] rounded-[12px] bg-[#F3EFE5]">
                    <input
                      type="number"
                      value={efficiency}
                      onChange={(e) => setEfficiency(e.target.value)}
                      placeholder="12"
                      step="0.1"
                      min="1"
                      className="w-full text-[20px] font-extrabold text-[#0E0E12] bg-transparent focus:outline-none placeholder:text-[rgba(14,14,18,0.25)] leading-none"
                      style={{
                        fontFamily: "'Paperlogy', 'Pretendard', sans-serif",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.6px",
                      }}
                    />
                    <span className="text-[11px] font-semibold text-[rgba(14,14,18,0.55)] shrink-0">km/L</span>
                  </div>
                </div>
                <div className="flex-[1.3]">
                  <p className="text-[11px] font-bold text-[rgba(14,14,18,0.55)] mb-1.5 tracking-[0.2px]">넣을 금액</p>
                  <div className="flex items-baseline gap-1 px-3 py-[11px] rounded-[12px] bg-[#F3EFE5]">
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="50000"
                      step="5000"
                      min="1000"
                      className="w-full text-[20px] font-extrabold text-[#0E0E12] bg-transparent focus:outline-none placeholder:text-[rgba(14,14,18,0.25)] leading-none"
                      style={{
                        fontFamily: "'Paperlogy', 'Pretendard', sans-serif",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.6px",
                      }}
                    />
                    <span className="text-[11px] font-semibold text-[rgba(14,14,18,0.55)] shrink-0">원</span>
                  </div>
                </div>
              </div>

              {/* 유종 */}
              <div>
                <p className="text-[11px] font-bold text-[rgba(14,14,18,0.55)] mb-1.5 tracking-[0.2px]">유종</p>
                <SegmentedControl
                  options={["gasoline", "diesel"] as const}
                  value={fuelType}
                  onChange={setFuelType}
                  labels={{ gasoline: "휘발유", diesel: "경유" }}
                />
              </div>

              {/* 이동 방식 */}
              <div>
                <p className="text-[11px] font-bold text-[rgba(14,14,18,0.55)] mb-1.5 tracking-[0.2px]">이동 방식</p>
                <SegmentedControl
                  options={["one-way", "round-trip"] as const}
                  value={tripType}
                  onChange={setTripType}
                  labels={{ "one-way": "편도", "round-trip": "왕복" }}
                />
              </div>

              {/* CTA 버튼 */}
              <button
                onClick={handleCalculate}
                disabled={isCalculating || (!address && !coords)}
                className="w-full flex items-center justify-center gap-1.5 bg-[#2046E5] hover:bg-[#1733B8] text-white text-sm font-extrabold py-[15px] rounded-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              >
                {isCalculating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    계산 중...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8L12 2z" />
                    </svg>
                    경제적 주유소 찾기
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-[rgba(14,14,18,0.35)] leading-[1.5]">
                {fuelType === "gasoline" ? "휘발유" : "경유"} 기준 · 가격 상위 35개 주유소 대상 · 광주·전남 한정
              </p>
            </div>

            {/* 에러 */}
            {error && (
              <div className="bg-[#FFE4E0] border border-[#FFB8B0] rounded-[14px] px-4 py-3 text-sm text-[#FF5A4C] font-semibold">
                {error}
              </div>
            )}

            {/* 결과 섹션 */}
            {results && results.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-[rgba(14,14,18,0.55)] tracking-[0.3px] mb-2 px-0.5">
                  실험 결과 · TOP {Math.min(results.length, 3)}
                </p>
                <div className="space-y-2.5">
                  {results[0] && (
                    <div
                      className="cursor-pointer"
                      onClick={() => setSelectedStationId((p) => p === results[0].station.uni_id ? null : results[0].station.uni_id)}
                    >
                      <WinnerCard result={results[0]} />
                    </div>
                  )}
                  {results.slice(1, 3).map((r, i) => (
                    <div
                      key={r.station.uni_id}
                      className="cursor-pointer"
                      onClick={() => setSelectedStationId((p) => p === r.station.uni_id ? null : r.station.uni_id)}
                    >
                      <RankCard result={r} rank={i + 2} />
                    </div>
                  ))}
                  {results.length > 3 && (
                    <p className="text-[11px] text-center text-[rgba(14,14,18,0.45)] py-1">
                      외 {results.length - 3}개 주유소
                    </p>
                  )}
                </div>
              </div>
            )}

            {results && results.length === 0 && (
              <div className="bg-white rounded-[16px] border border-[#E8E3D8] px-4 py-10 text-center text-sm text-[#3A3A44]">
                경로를 계산할 수 있는 주유소가 없습니다.
              </div>
            )}

          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
