const FAVORITES_KEY = "gwangju-oil-favorites";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addFavorite(stationId: string): string[] {
  const favorites = getFavorites();
  if (!favorites.includes(stationId)) {
    favorites.push(stationId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
  return favorites;
}

export function removeFavorite(stationId: string): string[] {
  const favorites = getFavorites().filter((id) => id !== stationId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return favorites;
}

export function isFavorite(stationId: string): boolean {
  return getFavorites().includes(stationId);
}

export function toggleFavorite(stationId: string): { favorites: string[]; added: boolean } {
  if (isFavorite(stationId)) {
    return { favorites: removeFavorite(stationId), added: false };
  }
  return { favorites: addFavorite(stationId), added: true };
}
