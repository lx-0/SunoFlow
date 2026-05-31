"use client";

import { useRef, useState } from "react";
import { TEMPO_PRESETS } from "@/app/[locale]/discover/discover-view.utils";
import { apiGet } from "@/lib/api-client";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useFilterState } from "@/hooks/useFilterState";
import type { DiscoverSong, DiscoverPagination } from "@/app/[locale]/discover/discover-view.types";

const INITIAL_PAGINATION: DiscoverPagination = { page: 1, totalPages: 1, total: 0, hasMore: false };

export function useDiscoverBrowse({
  active,
  initialSongs,
  initialPagination,
  initialSortBy,
  initialTag,
  initialMood,
  initialTempo,
}: {
  active: boolean;
  initialSongs?: DiscoverSong[];
  initialPagination?: DiscoverPagination;
  initialSortBy: string;
  initialTag: string;
  initialMood: string;
  initialTempo: string;
}) {
  const skipInitialFetch = useRef(!!initialSongs);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const { values: { tag, mood, tempoPreset }, set: setFilter, clearFilters, filterCount } =
    useFilterState({ tag: initialTag, mood: initialMood, tempoPreset: initialTempo });

  const tempoRange = TEMPO_PRESETS.find((p) => p.label === tempoPreset);

  const { items: songs, pagination, loading, loadingMore, error, sentinelRef } = useInfiniteScroll<DiscoverSong, DiscoverPagination>({
    active,
    initialItems: initialSongs,
    initialPagination: initialPagination ?? INITIAL_PAGINATION,
    initialLoading: !initialSongs,
    initialCursor: 1,
    fetchPage: async (page, _append) => {
      const params = new URLSearchParams({ page: String(page), sortBy });
      if (tag) params.set("tag", tag);
      if (mood) params.set("mood", mood);
      if (tempoRange?.min != null) params.set("tempoMin", String(tempoRange.min));
      if (tempoRange?.max != null) params.set("tempoMax", String(tempoRange.max));
      const data = await apiGet<{ songs: DiscoverSong[]; pagination: DiscoverPagination }>(`/api/songs/discover?${params}`);
      return { items: data.songs, pagination: data.pagination };
    },
    getNextCursor: (p) => p.page + 1,
    resetDeps: [sortBy, tag, mood, tempoRange],
    skipInitialFetch,
  });

  return {
    songs,
    pagination,
    sortBy,
    setSortBy,
    tag,
    setTag: (v: string) => setFilter("tag", v),
    mood,
    setMood: (v: string) => setFilter("mood", v),
    tempoPreset,
    setTempoPreset: (v: string) => setFilter("tempoPreset", v),
    loading,
    loadingMore,
    error,
    sentinelRef,
    filterCount,
    clearFilters,
  };
}
