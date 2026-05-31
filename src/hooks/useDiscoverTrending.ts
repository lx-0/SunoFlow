"use client";

import { useCallback, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { TrendingSong, TrendingPagination } from "@/app/[locale]/discover/discover-view.types";

const INITIAL_PAGINATION: TrendingPagination = { total: 0, limit: 20, offset: 0, hasMore: false };

export function useDiscoverTrending({
  active,
  sort,
}: {
  active: boolean;
  sort: "trending" | "popular";
}) {
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");

  const { items: songs, pagination, loading, loadingMore, error, sentinelRef } =
    useInfiniteScroll<TrendingSong, TrendingPagination>({
      active,
      initialPagination: INITIAL_PAGINATION,
      initialCursor: 0,
      fetchPage: async (offset, _append) => {
        const params = new URLSearchParams({ sort, limit: "20", offset: String(offset) });
        if (genre) params.set("genre", genre);
        if (mood) params.set("mood", mood);
        const data = await apiGet<{ songs: TrendingSong[]; pagination: TrendingPagination }>(`/api/songs/trending?${params}`);
        return { items: data.songs, pagination: data.pagination };
      },
      getNextCursor: (p) => p.offset + p.limit,
      resetDeps: [sort, genre, mood],
    });

  const filterCount = (genre ? 1 : 0) + (mood ? 1 : 0);

  const clearFilters = useCallback(() => {
    setGenre("");
    setMood("");
  }, []);

  return {
    songs,
    pagination,
    genre,
    setGenre,
    mood,
    setMood,
    loading,
    loadingMore,
    error,
    sentinelRef,
    filterCount,
    clearFilters,
  };
}
