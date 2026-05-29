"use client";

import { useEffect, useState } from "react";

interface UsePlayerFavoriteOptions {
  songId: string | undefined;
  isAuthenticated: boolean;
  usePublicEndpoint?: boolean;
}

export function usePlayerFavorite({ songId, isAuthenticated, usePublicEndpoint }: UsePlayerFavoriteOptions) {
  const [isFavorite, setIsFavorite] = useState(false);

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
  }, [songId, isAuthenticated, usePublicEndpoint]);

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
