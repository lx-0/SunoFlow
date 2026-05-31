"use client";

import { useEffect } from "react";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
import { fetchEffect } from "@/lib/fetch-effect";
import { apiPost, apiDelete } from "@/lib/api-client";

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
      if (newFav) {
        await apiPost(`/api/songs/${songId}/favorite`, {});
      } else {
        await apiDelete(`/api/songs/${songId}/favorite`);
      }
    },
  );

  useEffect(() => {
    if (!songId || !isAuthenticated) {
      setIsFavorite(false);
      return;
    }
    const url = usePublicEndpoint
      ? `/api/songs/${songId}/favorite`
      : `/api/songs/${songId}`;
    return fetchEffect<{ isFavorite?: boolean; song?: { isFavorite?: boolean } }>(
      url,
      (data) => {
        if (usePublicEndpoint) {
          setIsFavorite(data.isFavorite ?? false);
        } else if (data.song) {
          setIsFavorite(data.song.isFavorite ?? false);
        }
      },
    );
  }, [songId, isAuthenticated, usePublicEndpoint, setIsFavorite]);

  const handleToggleFavorite = () => {
    if (!songId) return;
    void toggleFavorite();
  };

  return { isFavorite, handleToggleFavorite };
}
