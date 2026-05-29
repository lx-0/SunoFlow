"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TEMPO_PRESETS } from "@/app/[locale]/discover/discover-view.utils";
import type { DiscoverSong, DiscoverPagination } from "@/app/[locale]/discover/discover-view.types";

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
  const [songs, setSongs] = useState<DiscoverSong[]>(initialSongs ?? []);
  const [pagination, setPagination] = useState<DiscoverPagination>(
    initialPagination ?? { page: 1, totalPages: 1, total: 0, hasMore: false }
  );
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [tag, setTag] = useState(initialTag);
  const [mood, setMood] = useState(initialMood);
  const [tempoPreset, setTempoPreset] = useState(initialTempo);
  const [loading, setLoading] = useState(initialSongs ? false : true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const tempoRange = TEMPO_PRESETS.find((p) => p.label === tempoPreset);

  const fetchSongs = useCallback(
    async (
      page: number,
      sort: string,
      genre: string,
      moodVal: string,
      tempoMin: number | null,
      tempoMax: number | null,
      append = false
    ) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), sortBy: sort });
        if (genre) params.set("tag", genre);
        if (moodVal) params.set("mood", moodVal);
        if (tempoMin !== null) params.set("tempoMin", String(tempoMin));
        if (tempoMax !== null) params.set("tempoMax", String(tempoMax));
        const res = await fetch(`/api/songs/discover?${params}`);
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
    []
  );

  useEffect(() => {
    if (!active) return;
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    setSongs([]);
    fetchSongs(
      1,
      sortBy,
      tag,
      mood,
      tempoRange?.min ?? null,
      tempoRange?.max ?? null
    );
  }, [active, sortBy, tag, mood, tempoRange, fetchSongs]);

  useEffect(() => {
    if (!active) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || !pagination.hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchSongs(
            pagination.page + 1,
            sortBy,
            tag,
            mood,
            tempoRange?.min ?? null,
            tempoRange?.max ?? null,
            true
          );
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [active, pagination.hasMore, pagination.page, loadingMore, sortBy, tag, mood, tempoRange, fetchSongs]);

  const filterCount = (tag ? 1 : 0) + (mood ? 1 : 0) + (tempoPreset ? 1 : 0);

  const clearFilters = useCallback(() => {
    setTag("");
    setMood("");
    setTempoPreset("");
  }, []);

  return {
    songs,
    pagination,
    sortBy,
    setSortBy,
    tag,
    setTag,
    mood,
    setMood,
    tempoPreset,
    setTempoPreset,
    loading,
    loadingMore,
    sentinelRef,
    filterCount,
    clearFilters,
  };
}
