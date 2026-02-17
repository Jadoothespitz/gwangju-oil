"use client";

import { useState, useEffect, useCallback } from "react";
import { GWANGJU_CENTER } from "@/lib/gwangju/districts";

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
  isFallback: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: false,
    isFallback: false,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      // 위치 서비스 미지원 → 광주시청 폴백
      setState({
        lat: GWANGJU_CENTER.lat,
        lng: GWANGJU_CENTER.lng,
        error: null,
        loading: false,
        isFallback: true,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
          loading: false,
          isFallback: false,
        });
      },
      () => {
        // 권한 거부 / 위치 불가 → 광주시청 폴백
        setState({
          lat: GWANGJU_CENTER.lat,
          lng: GWANGJU_CENTER.lng,
          error: null,
          loading: false,
          isFallback: true,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  // 마운트 시 자동 요청
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { ...state, requestLocation };
}
