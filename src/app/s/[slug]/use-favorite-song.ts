"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function useFavoriteSong(songId: string) {
  const { data: session } = useSession();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!songId || !session?.user) {
      setIsFavorite(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/songs/${songId}/favorite`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setIsFavorite(data.isFavorite ?? false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [songId, session?.user]);

  async function handleToggleFavorite() {
    if (!session?.user) return;
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

  return { session, isFavorite, handleToggleFavorite };
}
