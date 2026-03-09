"use client";

import useSWR from "swr";
import type { StationListResponse, District, FuelType, SortBy } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UseStationsOptions {
  district?: District;
  area?: string;
  dong?: string;
  fuelType: FuelType;
  sortBy: SortBy;
  brand?: string | null;
  lat?: number | null;
  lng?: number | null;
  radius?: number | null;
  page?: number;
  limit?: number;
}

export function useStations(options: UseStationsOptions) {
  const params = new URLSearchParams();

  if (options.district) params.set("district", options.district);
  if (options.area) params.set("area", options.area);
  if (options.dong) params.set("dong", options.dong);
  params.set("fuelType", options.fuelType);
  params.set("sortBy", options.sortBy);
  if (options.brand) params.set("brand", options.brand);
  if (options.lat != null) params.set("lat", String(options.lat));
  if (options.lng != null) params.set("lng", String(options.lng));
  if (options.radius != null) params.set("radius", String(options.radius));
  params.set("page", String(options.page ?? 1));
  params.set("limit", String(options.limit ?? 100));

  const { data, error, isLoading, mutate } = useSWR<StationListResponse>(
    `/api/stations?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  return {
    stations: data?.stations ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    isLoading,
    error,
    mutate,
  };
}
