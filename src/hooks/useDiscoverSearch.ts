"use client";

import { useCallback, useRef, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { PublicSong, PublicPagination } from "@/app/[locale]/discover/discover-view.types";

const INITIAL_PAGINATION: PublicPagination = { total: 0, limit: 20, offset: 0, hasMore: false };

export function useDiscoverSearch({ initialQuery }: { initialQuery: string }) {
  const [inputValue, setInputValue] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { items: results, pagination, loading, loadingMore, error, sentinelRef } =
    useInfiniteScroll<PublicSong, PublicPagination>({
      active: !!query,
      initialPagination: INITIAL_PAGINATION,
      initialCursor: 0,
      fetchPage: async (offset, _append) => {
        const params = new URLSearchParams({ q: query, limit: "20", offset: String(offset) });
        const data = await apiGet<{ songs: PublicSong[]; pagination: PublicPagination }>(`/api/songs/public?${params}`);
        return { items: data.songs, pagination: data.pagination };
      },
      getNextCursor: (p) => p.offset + p.limit,
      resetDeps: [query],
    });

  const handleChange = useCallback((value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(value.trim());
    }, 300);
  }, []);

  const clear = useCallback(() => {
    setInputValue("");
    setQuery("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return {
    inputValue,
    query,
    results,
    loading,
    loadingMore,
    error,
    pagination,
    sentinelRef,
    handleChange,
    clear,
  };
}
