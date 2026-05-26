"use client";

import { useEffect, useState } from "react";

interface UsePlayerFavoriteOptions {
  songId: string | undefined;
  isAuthenticated: boolean;
}

export function usePlayerFavorite({ songId, isAuthenticated }: UsePlayerFavoriteOptions) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!songId || !isAuthenticated) {
      setIsFavorite(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/songs/${songId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.song) setIsFavorite(data.song.isFavorite ?? false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [songId, isAuthenticated]);

  async function handleToggleFavorite() {
    if (!songId) return;
    const prev = isFavorite;
    const newFav = !prev;
    setIsFavorite(newFav);
    try {
      const res = await fetch(`/api/songs/${songId}/favorite`, {
        method: newFav ? "POST" : "DELETE",
      });
      if (!res.ok) {
        setIsFavorite(prev);
      }
    } catch {
      setIsFavorite(prev);
    }
  }

  return { isFavorite, handleToggleFavorite };
}
