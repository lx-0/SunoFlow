"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TrendingPagination, TrendingSong } from "./discover-view.types";

export function useDiscoverTrending(
  active: boolean,
  sort: "trending" | "popular",
) {
  const [songs, setSongs] = useState<TrendingSong[]>([]);
  const [pagination, setPagination] = useState<TrendingPagination>({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  const [offset, setOffset] = useState(0);
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchTrending = useCallback(
    async (
      sortVal: "trending" | "popular",
      genreVal: string,
      moodVal: string,
      offsetVal: number,
      append = false,
    ) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({
          sort: sortVal,
          limit: "20",
          offset: String(offsetVal),
        });
        if (genreVal) params.set("genre", genreVal);
        if (moodVal) params.set("mood", moodVal);
        const res = await fetch(`/api/songs/trending?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        setSongs((prev) => (append ? [...prev, ...data.songs] : data.songs));
        setPagination(data.pagination);
      } catch {
        // keep existing state
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!active) return;
    setSongs([]);
    setOffset(0);
    fetchTrending(sort, genre, mood, 0);
  }, [active, sort, genre, mood, fetchTrending]);

  useEffect(() => {
    if (!active) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || !pagination.hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const nextOffset = offset + 20;
          setOffset(nextOffset);
          fetchTrending(sort, genre, mood, nextOffset, true);
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [active, pagination.hasMore, offset, loadingMore, sort, genre, mood, fetchTrending]);

  const filterCount = (genre ? 1 : 0) + (mood ? 1 : 0);

  const clearFilters = useCallback(() => {
    setGenre("");
    setMood("");
  }, []);

  return {
    songs,
    pagination,
    offset,
    genre,
    setGenre,
    mood,
    setMood,
    loading,
    loadingMore,
    sentinelRef,
    filterCount,
    clearFilters,
  };
}
