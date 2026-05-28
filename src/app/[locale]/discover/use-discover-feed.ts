"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedPagination, FeedSong } from "./discover-view.types";

export function useDiscoverFeed(active: boolean, initialTag = "", initialMood = "") {
  const [songs, setSongs] = useState<FeedSong[]>([]);
  const [pagination, setPagination] = useState<FeedPagination>({
    page: 1,
    totalPages: 1,
    total: 0,
    hasMore: false,
  });
  const [tag, setTag] = useState(initialTag);
  const [mood, setMood] = useState(initialMood);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchFeed = useCallback(
    async (page: number, tagVal: string, moodVal: string, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const p = new URLSearchParams({ page: String(page) });
        if (tagVal) p.set("tag", tagVal);
        if (moodVal) p.set("mood", moodVal);
        const res = await fetch(`/api/discover?${p}`);
        if (!res.ok) return;
        const data = await res.json();
        setSongs((prev) => (append ? [...prev, ...data.feed] : data.feed));
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
    fetchFeed(1, tag, mood);
  }, [active, tag, mood, fetchFeed]);

  useEffect(() => {
    if (!active) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || !pagination.hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchFeed(pagination.page + 1, tag, mood, true);
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [active, pagination.hasMore, pagination.page, loadingMore, tag, mood, fetchFeed]);

  return {
    songs,
    pagination,
    tag,
    setTag,
    mood,
    setMood,
    loading,
    loadingMore,
    sentinelRef,
  };
}
