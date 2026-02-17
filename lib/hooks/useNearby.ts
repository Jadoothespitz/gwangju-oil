"use client";

import useSWR from "swr";
import type { StationWithDistance, FuelType, SortBy } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UseNearbyOptions {
  lat: number | null;
  lng: number | null;
  radius: number;
  fuelType: FuelType;
  sortBy: SortBy;
  limit?: number;
}

export function useNearby(options: UseNearbyOptions) {
  const canFetch = options.lat != null && options.lng != null;

  const params = new URLSearchParams();
  if (canFetch) {
    params.set("lat", String(options.lat));
    params.set("lng", String(options.lng));
  }
  params.set("radius", String(options.radius));
  params.set("fuelType", options.fuelType);
  params.set("sortBy", options.sortBy);
  params.set("limit", String(options.limit ?? 50));

  const { data, error, isLoading, mutate } = useSWR<{
    stations: StationWithDistance[];
  }>(
    canFetch ? `/api/stations/nearby?${params.toString()}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  return {
    stations: data?.stations ?? [],
    isLoading,
    error,
    mutate,
  };
}
