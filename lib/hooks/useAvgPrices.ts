"use client";

import useSWR from "swr";

interface FuelAvg {
  price: number | null;
  diff: number | null;
}

interface AvgPricesResponse {
  national: { gasoline: FuelAvg; diesel: FuelAvg };
  gwangju:  { gasoline: FuelAvg; diesel: FuelAvg };
  date: string | null;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

export function useAvgPrices() {
  const { data, error, isLoading } = useSWR<AvgPricesResponse>(
    "/api/prices/average",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 3600_000 }
  );

  return { data, isLoading, error };
}
