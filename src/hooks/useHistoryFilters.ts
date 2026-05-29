"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  parseHistoryFilterUrlState,
  toGenerationsApiSearchParams,
  toHistoryFilterSearchParams,
  type HistorySortKey,
} from "@/components/history/filter-url-state";
import type { HistoryStatusFilter } from "@/components/history/view-config";

interface GenerationEntry {
  id: string;
  title: string | null;
  prompt: string | null;
  tags: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  generationStatus: string;
  errorMessage: string | null;
  isInstrumental: boolean;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UseHistoryFiltersOptions {
  initialSongs: GenerationEntry[];
  initialNextCursor?: string | null;
  initialTotal?: number;
}

export function useHistoryFilters({
  initialSongs,
  initialNextCursor = null,
  initialTotal,
}: UseHistoryFiltersOptions) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const initialFilterState = parseHistoryFilterUrlState(searchParams);

  const [activeFilter, setActiveFilter] = useState(initialFilterState.status);
  const [sortKey, setSortKey] = useState<HistorySortKey>(initialFilterState.sort);
  const [searchQuery, setSearchQuery] = useState(initialFilterState.q);
  const [debouncedQuery, setDebouncedQuery] = useState(initialFilterState.q);
  const [dateFrom, setDateFrom] = useState(initialFilterState.from);
  const [dateTo, setDateTo] = useState(initialFilterState.to);

  const [songs, setSongs] = useState<GenerationEntry[]>(initialSongs);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [totalSongs, setTotalSongs] = useState(initialTotal ?? initialSongs.length);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterVersion, setFilterVersion] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setFilterVersion((v) => v + 1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    const params = toHistoryFilterSearchParams({
      status: activeFilter,
      sort: sortKey,
      q: debouncedQuery,
      from: dateFrom,
      to: dateTo,
    });
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, sortKey, debouncedQuery, dateFrom, dateTo]);

  function buildParams(cursor?: string): URLSearchParams {
    return toGenerationsApiSearchParams(
      { status: activeFilter, sort: sortKey, q: debouncedQuery, from: dateFrom, to: dateTo },
      cursor,
    );
  }

  useEffect(() => {
    if (filterVersion === 0) return;
    let cancelled = false;
    setLoading(true);
    setNextCursor(null);

    fetch(`/api/generations?${buildParams().toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.songs) {
          setSongs(data.songs);
          setNextCursor(data.nextCursor ?? null);
          setTotalSongs(data.total ?? data.songs.length);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterVersion]);

  const handleFilterChange = useCallback((f: HistoryStatusFilter) => {
    setActiveFilter(f);
    setFilterVersion((v) => v + 1);
  }, []);

  const handleSortChange = useCallback((s: HistorySortKey) => {
    setSortKey(s);
    setFilterVersion((v) => v + 1);
  }, []);

  const handleDateChange = useCallback(() => {
    setFilterVersion((v) => v + 1);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    fetch(`/api/generations?${buildParams(nextCursor).toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.songs) {
          setSongs((prev) => [...prev, ...data.songs]);
          setNextCursor(data.nextCursor ?? null);
          setTotalSongs(data.total ?? totalSongs);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCursor, loadingMore, activeFilter, sortKey, debouncedQuery, dateFrom, dateTo]);

  return {
    songs,
    setSongs,
    nextCursor,
    totalSongs,
    loading,
    loadingMore,
    activeFilter,
    sortKey,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    handleFilterChange,
    handleSortChange,
    handleDateChange,
    handleLoadMore,
  };
}
