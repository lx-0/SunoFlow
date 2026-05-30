"use client";

import { useCallback, useRef, useState } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { PublicSong, PublicPagination } from "@/app/[locale]/discover/discover-view.types";

const INITIAL_PAGINATION: PublicPagination = { total: 0, limit: 20, offset: 0, hasMore: false };

export function useDiscoverSearch({ initialQuery }: { initialQuery: string }) {
  const [inputValue, setInputValue] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { items: results, pagination, loading, loadingMore, sentinelRef } =
    useInfiniteScroll<PublicSong, PublicPagination>({
      active: !!query,
      initialPagination: INITIAL_PAGINATION,
      initialCursor: 0,
      fetchPage: async (offset, _append) => {
        const params = new URLSearchParams({ q: query, limit: "20", offset: String(offset) });
        const res = await fetch(`/api/songs/public?${params}`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
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
    pagination,
    sentinelRef,
    handleChange,
    clear,
  };
}
