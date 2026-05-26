"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicSong, PublicPagination } from "@/app/[locale]/discover/discover-view.types";

export function useDiscoverSearch({ initialQuery }: { initialQuery: string }) {
  const [inputValue, setInputValue] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PublicSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<PublicPagination>({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchSearch = useCallback(
    async (q: string, offset: number, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({ q, limit: "20", offset: String(offset) });
        const res = await fetch(`/api/songs/public?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        setResults((prev) => (append ? [...prev, ...data.songs] : data.songs));
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
    if (!query) {
      setResults([]);
      return;
    }
    setResults([]);
    fetchSearch(query, 0);
  }, [query, fetchSearch]);

  useEffect(() => {
    if (!query) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || !pagination.hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const nextOffset = pagination.offset + pagination.limit;
          fetchSearch(query, nextOffset, true);
          setPagination((p) => ({ ...p, offset: nextOffset }));
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [query, pagination, loadingMore, fetchSearch]);

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
    setResults([]);
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
