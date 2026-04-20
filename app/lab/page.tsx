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
  RTO: { background: "#F3F4F6", color: "#6B7280" },
  ETC: { background: "#F3F4F6", color: "#6B7280" },
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

function LabResultCard({
  result,
  rank,
  isEconomical,
  isCheapest,
  isSelected,
  onClick,
}: {
  result: LabResult;
  rank: number;
  isEconomical: boolean;
  isCheapest: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const brandStyle = BRAND_STYLES[result.station.brand] || BRAND_STYLES.ETC;

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border p-4 cursor-pointer transition-shadow",
        isSelected
          ? "border-blue-400 shadow-lg ring-2 ring-blue-200"
          : isEconomical
          ? "border-blue-300 shadow-md"
          : "border-gray-100 shadow-sm hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0",
            isEconomical ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
          )}
        >
          {rank}
        </span>
        {isEconomical && (
          <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
            가장 경제적
          </span>
        )}
        {isCheapest && (
          <span className="text-xs font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
            가장 저렴
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
          style={brandStyle}
        >
          {result.station.brandName}
        </span>
        <span className="text-sm font-bold text-gray-900 truncate">{result.station.name}</span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
        <span className="font-medium text-gray-700">
          {result.pricePerL.toLocaleString()}원/L
        </span>
        <span>편도 {formatDistance(result.distanceM)}</span>
        <span>
          {result.tripType === "one-way" ? "편도" : "왕복"} {result.travelKm.toFixed(1)}km 기준
        </span>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">총 주유량</span>
          <span className="font-medium">{result.totalFuelL.toFixed(2)}L</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">이동 연료 소모</span>
          <span className="font-medium text-orange-500">- {result.travelFuelL.toFixed(2)}L</span>
        </div>
        <div className="flex justify-between items-center pt-1.5 border-t border-gray-200">
          <span className="text-sm font-semibold text-gray-700">순 주유량</span>
          <span className="text-xl font-extrabold text-blue-700">
            {result.netFuelL.toFixed(2)}
            <span className="text-sm font-normal text-gray-500 ml-0.5">L</span>
          </span>
        </div>
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

  useEffect(() => {
    if (efficiency) localStorage.setItem("lab_efficiency", efficiency);
  }, [efficiency]);

  useEffect(() => {
    if (budget) localStorage.setItem("lab_budget", budget);
  }, [budget]);

  useEffect(() => {
    localStorage.setItem("lab_fuelType", fuelType);
  }, [fuelType]);

  useEffect(() => {
    localStorage.setItem("lab_tripType", tripType);
  }, [tripType]);

  // 주소 입력 시 자동완성 debounce
  useEffect(() => {
    if (!address || address.length < 2 || coords) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-address?query=${encodeURIComponent(address)}`);
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [address, coords]);

  // 드롭다운 외부 클릭 시 닫기
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
    if (!navigator.geolocation) {
      setError("이 브라우저는 위치 감지를 지원하지 않습니다.");
      return;
    }
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
      () => {
        setIsLocating(false);
        setError("위치를 가져오지 못했습니다. 주소를 직접 입력해 주세요.");
      },
      { timeout: 10000 }
    );
  }, []);

  const handleCalculate = useCallback(async () => {
    setError(null);

    if (!address && !coords) {
      setError("출발지를 입력해 주세요.");
      return;
    }

    const effNum = parseFloat(efficiency);
    const budgetNum = parseInt(budget);
    if (!effNum || effNum <= 0) {
      setError("연비를 올바르게 입력해 주세요. (예: 12.5)");
      return;
    }
    if (!budgetNum || budgetNum <= 0) {
      setError("주유 금액을 올바르게 입력해 주세요. (예: 60000)");
      return;
    }

    setIsCalculating(true);
    try {
      let resolvedCoords = coords;

      if (!resolvedCoords && address) {
        const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
        const geoData = await geoRes.json();
        if (!geoRes.ok || !geoData.lat) {
          setError("주소를 찾을 수 없습니다. 더 자세하게 입력해 주세요. (예: 광주 북구 용봉동)");
          return;
        }
        resolvedCoords = { lat: geoData.lat, lng: geoData.lng };
        setCoords(resolvedCoords);
      }

      const res = await fetch(
        `/api/lab/calculate?lat=${resolvedCoords!.lat}&lng=${resolvedCoords!.lng}&efficiency=${effNum}&budget=${budgetNum}&tripType=${tripType}&fuelType=${fuelType}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "계산 중 오류가 발생했습니다.");
        return;
      }

      setResults(data.results);
      setSelectedStationId(null);
    } catch {
      setError("서버와 통신하는 중 오류가 발생했습니다.");
    } finally {
      setIsCalculating(false);
    }
  }, [address, coords, efficiency, budget, tripType, fuelType]);

  const cheapestId =
    results && results.length > 0
      ? results.reduce((min, r) => (r.pricePerL < min.pricePerL ? r : min), results[0])
          .station.uni_id
      : null;

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
      <header className="sticky top-0 z-40 bg-blue-700 text-white shadow-md">
        <div className="flex items-center justify-center h-12 px-4 max-w-lg mx-auto">
          <h1 className="text-base font-bold tracking-tight">실험실 — 경제적 주유소 찾기</h1>
        </div>
      </header>

      {/* 모바일: 세로 (지도 위 + 폼 아래) / 데스크탑: 가로 (폼 왼쪽 + 지도 오른쪽) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* 지도 — 모바일: 상단 고정 높이 / 데스크탑: order-2로 오른쪽 */}
        <div className="h-48 shrink-0 lg:h-auto lg:flex-1 lg:order-2">
          <LabMap origin={coords} stations={mapStations} selectedId={selectedStationId} />
        </div>

        {/* 폼 + 결과 — 모바일: 나머지 / 데스크탑: order-1로 왼쪽 고정폭 */}
        <div className="flex-1 lg:flex-none lg:w-[420px] overflow-y-auto pb-16 lg:order-1">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-3 lg:max-w-none">

          {/* 입력 카드 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
            <p className="text-xs text-gray-500 leading-relaxed">
              단순 최저가가 아닌, 내 차의 연비와 실제 이동 거리를 반영해 순 주유량이 가장 많은 주유소를 찾아줍니다.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">출발지</label>
              <div className="relative" ref={suggestionRef}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setCoords(null);
                    }}
                    placeholder="예: 광주 이마트, 북구 용봉로 77"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-0"
                  />
                  <button
                    onClick={handleGeolocate}
                    disabled={isLocating}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg px-3 py-2.5 hover:bg-blue-50 transition-colors whitespace-nowrap disabled:opacity-50 shrink-0"
                  >
                    {isLocating ? (
                      "감지 중..."
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
                        </svg>
                        내 위치
                      </>
                    )}
                  </button>
                </div>

                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectSuggestion(s);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                      >
                        <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                        {s.address && s.address !== s.name && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{s.address}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">내 차 연비</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={efficiency}
                  onChange={(e) => setEfficiency(e.target.value)}
                  placeholder="예: 12.5"
                  step="0.1"
                  min="1"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">km/L</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">이번에 넣을 금액</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="예: 60000"
                  step="5000"
                  min="1000"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <span className="text-sm text-gray-500">원</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">유종</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                  {(["gasoline", "diesel"] as const).map((ft, i) => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => setFuelType(ft)}
                      className={cn(
                        "flex-1 py-2 text-center transition-colors",
                        i > 0 && "border-l border-gray-200",
                        fuelType === ft
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {ft === "gasoline" ? "휘발유" : "경유"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">이동 방식</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                  {(["one-way", "round-trip"] as const).map((tt, i) => (
                    <button
                      key={tt}
                      type="button"
                      onClick={() => setTripType(tt)}
                      className={cn(
                        "flex-1 py-2 text-center transition-colors",
                        i > 0 && "border-l border-gray-200",
                        tripType === tt
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {tt === "one-way" ? "편도" : "왕복"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCalculate}
              disabled={isCalculating || (!address && !coords)}
              className="w-full bg-blue-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCalculating ? "계산 중..." : "경제적 주유소 찾기"}
            </button>

            <p className="text-[10px] text-gray-400 text-center">
              {fuelType === "gasoline" ? "휘발유" : "경유"} 기준 · 가격 상위 {35}개 주유소 대상
              <br />출발지 검색은 광주·전남 지역으로 제한됩니다
            </p>
          </div>

          {/* 에러 */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 결과 요약 */}
          {results && results.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
              <span className="font-semibold">{results[0].station.name}</span>에서{" "}
              {parseInt(budget).toLocaleString()}원으로 가장 많이 주유할 수 있어요{" "}
              <span className="font-bold">(순 {results[0].netFuelL.toFixed(2)}L)</span>
            </div>
          )}

          {/* 결과 목록 */}
          {results?.map((r, i) => (
            <LabResultCard
              key={r.station.uni_id}
              result={r}
              rank={i + 1}
              isEconomical={i === 0}
              isCheapest={cheapestId === r.station.uni_id && i !== 0}
              isSelected={selectedStationId === r.station.uni_id}
              onClick={() =>
                setSelectedStationId((prev) =>
                  prev === r.station.uni_id ? null : r.station.uni_id
                )
              }
            />
          ))}

          {results && results.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-10 text-center text-sm text-gray-400">
              경로를 계산할 수 있는 주유소가 없습니다.
            </div>
          )}

        </div>
        </div>{/* 스크롤 div 닫기 */}

      </div>{/* flex row 닫기 */}

      <BottomNav />
    </div>
  );
}
