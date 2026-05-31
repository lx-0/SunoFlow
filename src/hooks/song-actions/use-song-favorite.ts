"use client";

import { useCallback, useState } from "react";
import { type ToastFn } from "@/components/Toast";
import { apiPost, apiDelete } from "@/lib/api-client";


interface UseSongFavoriteParams {
  songId: string;
  initialFavorite: boolean;
  initialFavoriteCount: number;
  toast: ToastFn;
}

export function useSongFavorite({
  songId,
  initialFavorite,
  initialFavoriteCount,
  toast,
}: UseSongFavoriteParams) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);

  const handleToggleFavorite = useCallback(async () => {
    const prev = isFavorite;
    const prevCount = favoriteCount;
    const newFav = !prev;
    setIsFavorite(newFav);
    setFavoriteCount(newFav ? prevCount + 1 : Math.max(0, prevCount - 1));
    try {
      if (newFav) {
        const data = await apiPost<{ favoriteCount: number }>(`/api/songs/${songId}/favorite`, {});
        setFavoriteCount(data.favoriteCount);
      } else {
        await apiDelete(`/api/songs/${songId}/favorite`);
      }
      toast(newFav ? "Added to favorites" : "Removed from favorites", "success");
    } catch {
      setIsFavorite(prev);
      setFavoriteCount(prevCount);
      toast("Failed to update favorite", "error");
    }
  }, [isFavorite, favoriteCount, songId, toast]);

  return { isFavorite, favoriteCount, handleToggleFavorite };
}
