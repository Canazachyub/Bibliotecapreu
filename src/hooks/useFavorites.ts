import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'lib:favs';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Sincronizar con localStorage cuando cambian los favoritos
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
    } catch {
      // Ignorar errores de localStorage
    }
  }, [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  const addFavorite = useCallback((id: string) => {
    setFavorites(prev => new Set(prev).add(id));
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    addFavorite,
    removeFavorite,
    count: favorites.size,
  };
}

export default useFavorites;
