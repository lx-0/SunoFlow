"use client";

import { useState } from "react";

interface UseSongFavoriteOptions {
  songId: string;
  initialFavorite: boolean;
  initialFavoriteCount: number;
  toast: (message: string, variant?: "success" | "error" | "info") => void;
}

export function useSongFavorite({
  songId,
  initialFavorite,
  initialFavoriteCount,
  toast,
}: UseSongFavoriteOptions) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);

  async function handleToggleFavorite() {
    const prev = isFavorite;
    const prevCount = favoriteCount;
    const newFav = !prev;
    setIsFavorite(newFav);
    setFavoriteCount(newFav ? prevCount + 1 : Math.max(0, prevCount - 1));
    try {
      const res = await fetch(`/api/songs/${songId}/favorite`, {
        method: newFav ? "POST" : "DELETE",
      });
      if (!res.ok) {
        setIsFavorite(prev);
        setFavoriteCount(prevCount);
        toast("Failed to update favorite", "error");
      } else {
        const data = await res.json();
        setFavoriteCount(data.favoriteCount);
        toast(newFav ? "Added to favorites" : "Removed from favorites", "success");
      }
    } catch {
      setIsFavorite(prev);
      setFavoriteCount(prevCount);
      toast("Failed to update favorite", "error");
    }
  }

  return { isFavorite, favoriteCount, handleToggleFavorite };
}
