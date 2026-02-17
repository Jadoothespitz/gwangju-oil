"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getFavorites,
  toggleFavorite as toggleFav,
} from "@/lib/favorites/localStorage";

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    setFavoriteIds(getFavorites());
  }, []);

  const toggleFavorite = useCallback((stationId: string) => {
    const { favorites, added } = toggleFav(stationId);
    setFavoriteIds(favorites);
    return added;
  }, []);

  const isFavorite = useCallback(
    (stationId: string) => favoriteIds.includes(stationId),
    [favoriteIds]
  );

  return { favoriteIds, toggleFavorite, isFavorite };
}
