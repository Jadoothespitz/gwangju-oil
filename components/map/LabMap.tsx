"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoSdk } from "@/lib/map/loadKakaoSdk";
import { GWANGJU_CENTER, GWANGJU_MAP_LEVEL } from "@/lib/gwangju/districts";

export interface LabMapStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rank: number;
  netFuelL: number;
}

interface LabMapProps {
  origin: { lat: number; lng: number } | null;
  stations: LabMapStation[];
  selectedId?: string | null;
}

function buildStationContent(s: LabMapStation, isSelected: boolean): string {
  const circleBg = s.rank === 1 || isSelected ? "#1d4ed8" : "#475569";
  const labelBg = isSelected ? "#1d4ed8" : "white";
  const labelColor = isSelected ? "white" : "#1e293b";
  const labelBorder = isSelected ? "#1d4ed8" : "#e2e8f0";
  const ringStyle = isSelected
    ? "box-shadow:0 0 0 2px white,0 0 0 4px #1d4ed8,0 2px 8px rgba(0,0,0,.3)"
    : "box-shadow:0 2px 6px rgba(0,0,0,.25)";
  return `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">
      <div style="padding:1px 6px;background:${labelBg};border:1px solid ${labelBorder};border-radius:4px;font-size:10px;font-weight:600;color:${labelColor};white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.1)">${s.netFuelL.toFixed(1)}L</div>
      <div style="width:26px;height:26px;background:${circleBg};color:white;border-radius:50%;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white;${ringStyle};margin-top:2px">${s.rank}</div>
    </div>
  `;
}

export default function LabMap({ origin, stations, selectedId }: LabMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const originOverlayRef = useRef<any>(null);
  const stationOverlaysRef = useRef<Map<string, { overlay: any; station: LabMapStation }>>(new Map());

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    loadKakaoSdk()
      .then(() => {
        if (cancelled || mapInstanceRef.current) return;
        const kakao = (window as any).kakao;
        mapInstanceRef.current = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(GWANGJU_CENTER.lat, GWANGJU_CENTER.lng),
          level: GWANGJU_MAP_LEVEL,
        });
        setIsLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });

    return () => { cancelled = true; };
  }, []);

  // 마커/오버레이 재생성 (origin, stations 변경 시)
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    const kakao = (window as any).kakao;
    const map = mapInstanceRef.current;

    // 기존 제거
    if (originOverlayRef.current) {
      originOverlayRef.current.setMap(null);
      originOverlayRef.current = null;
    }
    stationOverlaysRef.current.forEach(({ overlay }) => overlay.setMap(null));
    stationOverlaysRef.current.clear();

    const bounds = new kakao.maps.LatLngBounds();
    let hasPoints = false;

    if (origin) {
      const pos = new kakao.maps.LatLng(origin.lat, origin.lng);
      const content = `<div style="width:18px;height:18px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px #3b82f6,0 2px 6px rgba(0,0,0,.3)"></div>`;
      originOverlayRef.current = new kakao.maps.CustomOverlay({
        map,
        position: pos,
        content,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 20,
      });
      bounds.extend(pos);
      hasPoints = true;
    }

    stations.forEach((s) => {
      const pos = new kakao.maps.LatLng(s.lat, s.lng);
      const isSelected = s.id === selectedId;
      const overlay = new kakao.maps.CustomOverlay({
        map,
        position: pos,
        content: buildStationContent(s, isSelected),
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: s.rank === 1 ? 10 : 5,
      });
      stationOverlaysRef.current.set(s.id, { overlay, station: s });
      bounds.extend(pos);
      hasPoints = true;
    });

    if (hasPoints) {
      map.setBounds(bounds, 60);
    } else {
      map.setCenter(new kakao.maps.LatLng(GWANGJU_CENTER.lat, GWANGJU_CENTER.lng));
      map.setLevel(GWANGJU_MAP_LEVEL);
    }
  // selectedId는 아래 effect에서 처리
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, origin, stations]);

  // 선택 변경 시 하이라이트 + 지도 이동
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;
    const kakao = (window as any).kakao;
    const map = mapInstanceRef.current;

    stationOverlaysRef.current.forEach(({ overlay, station }, id) => {
      overlay.setContent(buildStationContent(station, id === selectedId));
      overlay.setZIndex(id === selectedId ? 15 : station.rank === 1 ? 10 : 5);
    });

    if (selectedId) {
      const entry = stationOverlaysRef.current.get(selectedId);
      if (entry) {
        map.panTo(new kakao.maps.LatLng(entry.station.lat, entry.station.lng));
      }
    }
  }, [isLoaded, selectedId]);

  return (
    <div className="w-full h-full bg-gray-100 relative">
      <div ref={mapRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <p className="text-sm text-gray-500">
            {loadError ? `지도 로딩 실패: ${loadError}` : "지도 로딩 중..."}
          </p>
        </div>
      )}
    </div>
  );
}
