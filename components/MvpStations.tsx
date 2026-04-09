"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { StationListResponse, FuelType } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const RANK_ICONS = ["🥇", "🥈", "🥉"];

function buildUrl(fuelType: FuelType) {
  return `/api/stations?fuelType=${fuelType}&sortBy=price&limit=3&cardType=sangsaeng`;
}

export default function MvpStations() {
  const [fuelType, setFuelType] = useState<FuelType>("gasoline");

  const { data, isLoading } = useSWR<StationListResponse>(
    buildUrl(fuelType),
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const stations = (data?.stations ?? []).filter((s) =>
    fuelType === "gasoline" ? s.prices.gasoline != null : s.prices.diesel != null
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-amber-800">오늘의 MVP 주유소 🏆</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setFuelType("gasoline")}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
              fuelType === "gasoline"
                ? "bg-amber-600 text-white"
                : "bg-white text-amber-700 border border-amber-300"
            }`}
          >
            휘발유
          </button>
          <button
            onClick={() => setFuelType("diesel")}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
              fuelType === "diesel"
                ? "bg-amber-600 text-white"
                : "bg-white text-amber-700 border border-amber-300"
            }`}
          >
            경유
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-3 animate-pulse flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-200 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
          ))
        ) : stations.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">데이터가 없습니다</p>
        ) : (
          stations.map((station, i) => {
            const [lng, lat] = station.location.coordinates;
            const price =
              fuelType === "diesel" ? station.prices.diesel : station.prices.gasoline;
            return (
              <Link
                key={station.uni_id}
                href={`/?station=${station.uni_id}&clat=${lat}&clng=${lng}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50 active:bg-amber-100 transition-colors"
              >
                <span className="text-lg leading-none shrink-0">{RANK_ICONS[i]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{station.name}</p>
                  <p className="text-xs text-gray-500">
                    {station.brandName} · {station.district}
                  </p>
                </div>
                <span className="text-sm font-bold text-blue-700 shrink-0">
                  {price != null ? `${price.toLocaleString()}원` : "—"}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
