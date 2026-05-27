"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DiscoverPlaylist,
  PlaylistDiscoverPagination,
} from "./discover-view.types";

export function useDiscoverPlaylists(active: boolean) {
  const [playlists, setPlaylists] = useState<DiscoverPlaylist[]>([]);
  const [pagination, setPagination] = useState<PlaylistDiscoverPagination>({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0,
    hasMore: false,
  });
  const [sort, setSort] = useState("trending");
  const [genre, setGenre] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPlaylists = useCallback(
    async (page: number, sortVal: string, genreVal: string, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), sort: sortVal });
        if (genreVal) params.set("genre", genreVal);
        const res = await fetch(`/api/playlists/discover?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        setPlaylists((prev) =>
          append ? [...prev, ...data.playlists] : data.playlists,
        );
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
    setPlaylists([]);
    fetchPlaylists(1, sort, genre);
  }, [active, sort, genre, fetchPlaylists]);

  useEffect(() => {
    if (!active) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || !pagination.hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchPlaylists(pagination.page + 1, sort, genre, true);
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [active, pagination.hasMore, pagination.page, loadingMore, sort, genre, fetchPlaylists]);

  return {
    playlists,
    pagination,
    sort,
    setSort,
    genre,
    setGenre,
    loading,
    loadingMore,
    sentinelRef,
  };
}
