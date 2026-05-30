"use client";

import { useEffect } from "react";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";

interface UsePlayerFavoriteOptions {
  songId: string | undefined;
  isAuthenticated: boolean;
  usePublicEndpoint?: boolean;
}

export function usePlayerFavorite({ songId, isAuthenticated, usePublicEndpoint }: UsePlayerFavoriteOptions) {
  const [toggleFavorite, isFavorite, , setIsFavorite] = useOptimisticToggle(
    false,
    async (newFav: boolean) => {
      if (!songId) return;
      const res = await fetch(`/api/songs/${songId}/favorite`, {
        method: newFav ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error("failed");
    },
  );

  useEffect(() => {
    if (!songId || !isAuthenticated) {
      setIsFavorite(false);
      return;
    }
    let cancelled = false;
    const url = usePublicEndpoint
      ? `/api/songs/${songId}/favorite`
      : `/api/songs/${songId}`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (usePublicEndpoint) {
          if (data) setIsFavorite(data.isFavorite ?? false);
        } else {
          if (data?.song) setIsFavorite(data.song.isFavorite ?? false);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [songId, isAuthenticated, usePublicEndpoint, setIsFavorite]);

  const handleToggleFavorite = () => {
    if (!songId) return;
    void toggleFavorite();
  };

  return { isFavorite, handleToggleFavorite };
}
