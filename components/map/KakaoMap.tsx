"use client";

import { useEffect, useRef, useState } from "react";
import type { StationWithDistance, FuelType } from "@/types";
import { GWANGJU_CENTER, GWANGJU_MAP_LEVEL } from "@/lib/gwangju/districts";
import { formatPrice } from "@/lib/utils/formatPrice";

// 전역 SDK 로딩 상태 관리
let sdkLoadPromise: Promise<void> | null = null;

function loadKakaoSdk(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    // 이미 maps.load가 완료된 경우
    if ((window as any).kakao?.maps?.LatLng) {
      resolve();
      return;
    }

    // CORS 우회를 위해 자체 프록시를 통해 로드
    const script = document.createElement("script");
    script.src = "/api/kakao-sdk";
    script.onload = () => {
      const kakao = (window as any).kakao;
      if (kakao?.maps?.load) {
        kakao.maps.load(() => resolve());
      } else {
        sdkLoadPromise = null;
        reject(new Error("Kakao SDK loaded but kakao.maps not found"));
      }
    };
    script.onerror = () => {
      sdkLoadPromise = null;
      reject(new Error("Failed to load Kakao Maps SDK"));
    };
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

interface KakaoMapProps {
  stations: StationWithDistance[];
  favoriteIds: Set<string>;
  fuelType: FuelType;
  center?: { lat: number; lng: number };
  mapLevel?: number;
  userLocation?: { lat: number; lng: number } | null;
  radius?: number;
  selectedStationId?: string | null;
  onStationSelect?: (id: string) => void;
}

export default function KakaoMap({
  stations,
  favoriteIds,
  fuelType,
  center,
  mapLevel,
  userLocation,
  radius,
  selectedStationId,
  onStationSelect,
}: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const circleRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 카카오맵 SDK 로딩 + 초기화
  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    loadKakaoSdk()
      .then(() => {
        if (cancelled || mapInstanceRef.current) return;

        const kakao = (window as any).kakao;
        const mapCenter = center || GWANGJU_CENTER;
        const options = {
          center: new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng),
          level: GWANGJU_MAP_LEVEL,
        };

        mapInstanceRef.current = new kakao.maps.Map(mapRef.current, options);
        setIsLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });

    return () => { cancelled = true; };
  }, []);

  // 센터/레벨 변경 시 이동
  useEffect(() => {
    if (!mapInstanceRef.current || !center) return;
    const kakao = (window as any).kakao;
    const map = mapInstanceRef.current;
    map.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
    if (mapLevel != null) {
      map.setLevel(mapLevel);
    }
  }, [center, mapLevel]);

  // 마커/오버레이 참조를 station ID 기준으로 관리
  const stationMarkersRef = useRef<Map<string, { marker: any; overlay: any; isFav: boolean; baseZIndex: number }>>(new Map());
  const onStationSelectRef = useRef(onStationSelect);
  onStationSelectRef.current = onStationSelect;
  const initialBoundsSetRef = useRef(false);

  // 마커 생성 (stations, fuelType 등 변경 시)
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    const kakao = (window as any).kakao;
    const map = mapInstanceRef.current;

    // 기존 마커/오버레이 제거
    markersRef.current.forEach((m) => m.setMap(null));
    overlaysRef.current.forEach((o) => o.setMap(null));
    markersRef.current = [];
    overlaysRef.current = [];
    stationMarkersRef.current.clear();

    // 주유소 마커 추가
    stations.forEach((station) => {
      const [lng, lat] = station.location.coordinates;
      if (!lat || !lng) return;

      const position = new kakao.maps.LatLng(lat, lng);
      const isFav = favoriteIds.has(station.uni_id);
      const price =
        fuelType === "diesel"
          ? station.prices.diesel
          : station.prices.gasoline;

      // 마커 이미지
      const markerSize = new kakao.maps.Size(24, 35);
      const markerImage = new kakao.maps.MarkerImage(
        isFav
          ? "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png"
          : "https://t1.daumcdn.net/localimg/localimages/07/2018/pc/img/marker_spot.png",
        markerSize
      );

      const marker = new kakao.maps.Marker({
        map,
        position,
        image: markerImage,
        title: station.name,
        zIndex: isFav ? 5 : 1,
      });

      // 가격/이름 오버레이
      const label = price ? formatPrice(price) : station.name;
      const priceContent = `
        <div style="
          padding: 2px 6px;
          background: ${isFav ? "#dc2626" : "#ffffff"};
          color: ${isFav ? "#ffffff" : "#0f172a"};
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
          transform: translateY(-8px);
          cursor: pointer;
        ">
          ${label}
        </div>
      `;

      const overlay = new kakao.maps.CustomOverlay({
        map,
        position,
        content: priceContent,
        yAnchor: 2.2,
        zIndex: 2,
      });

      kakao.maps.event.addListener(marker, "click", () => {
        onStationSelectRef.current?.(station.uni_id);
      });

      stationMarkersRef.current.set(station.uni_id, { marker, overlay, isFav, baseZIndex: isFav ? 5 : 1 });
      markersRef.current.push(marker);
      overlaysRef.current.push(overlay);
    });

    // 사용자 위치 마커
    if (userLocation) {
      const userPosition = new kakao.maps.LatLng(
        userLocation.lat,
        userLocation.lng
      );

      const userContent = `
        <div style="
          width: 16px; height: 16px;
          background: #3b82f6;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 0 2px #3b82f6, 0 2px 6px rgba(0,0,0,0.3);
        "></div>
      `;

      const userOverlay = new kakao.maps.CustomOverlay({
        map,
        position: userPosition,
        content: userContent,
        zIndex: 20,
      });
      overlaysRef.current.push(userOverlay);
    }

    // 반경 원
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }
    if (userLocation && radius) {
      circleRef.current = new kakao.maps.Circle({
        map,
        center: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
        radius,
        strokeWeight: 2,
        strokeColor: "#3b82f6",
        strokeOpacity: 0.5,
        strokeStyle: "dashed",
        fillColor: "#3b82f6",
        fillOpacity: 0.05,
      });
    }

    // 최초 로딩 시에만 bounds 조정 (이후엔 center/level effect가 처리)
    if (!initialBoundsSetRef.current && stations.length > 0) {
      initialBoundsSetRef.current = true;
      const bounds = new kakao.maps.LatLngBounds();
      stations.forEach((s) => {
        const [lng, lat] = s.location.coordinates;
        if (lat && lng) bounds.extend(new kakao.maps.LatLng(lat, lng));
      });
      if (userLocation) {
        bounds.extend(
          new kakao.maps.LatLng(userLocation.lat, userLocation.lng)
        );
      }
      map.setBounds(bounds, 50);
    }
  }, [isLoaded, stations, favoriteIds, fuelType, userLocation, radius]);

  // 선택 상태 변경 시 오버레이 스타일만 업데이트 (줌 유지)
  useEffect(() => {
    if (!isLoaded) return;

    stationMarkersRef.current.forEach(({ marker, overlay, isFav, baseZIndex }, id) => {
      const isSelected = selectedStationId === id;

      marker.setZIndex(isSelected ? 10 : baseZIndex);

      // 오버레이 스타일 업데이트
      let el = overlay.getContent();
      if (typeof el === "string") {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = el.trim();
        const node = wrapper.firstElementChild as HTMLElement;
        if (node) {
          overlay.setContent(node);
          el = node;
        }
      }
      if (el instanceof HTMLElement) {
        if (isSelected) {
          el.style.background = "#1d4ed8";
          el.style.color = "#ffffff";
          el.style.borderColor = "#1d4ed8";
          overlay.setZIndex(11);
        } else {
          el.style.background = isFav ? "#dc2626" : "#ffffff";
          el.style.color = isFav ? "#ffffff" : "#0f172a";
          el.style.borderColor = "#cbd5e1";
          overlay.setZIndex(2);
        }
      }
    });
  }, [isLoaded, selectedStationId]);

  return (
    <div className="map-container w-full bg-gray-100 relative">
      <div ref={mapRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <p className="text-gray-500 text-sm">
            {loadError ? `지도 로딩 실패: ${loadError}` : "지도 로딩 중..."}
          </p>
        </div>
      )}
    </div>
  );
}
