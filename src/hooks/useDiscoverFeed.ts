"use client";

import { useState } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { FeedSong, FeedPagination } from "@/app/[locale]/discover/discover-view.types";

const INITIAL_PAGINATION: FeedPagination = { page: 1, totalPages: 1, total: 0, hasMore: false };

export function useDiscoverFeed({
  active,
  initialTag,
  initialMood,
}: {
  active: boolean;
  initialTag: string;
  initialMood: string;
}) {
  const [tag, setTag] = useState(initialTag);
  const [mood, setMood] = useState(initialMood);

  const { items: songs, pagination, loading, loadingMore, sentinelRef } = useInfiniteScroll<FeedSong, FeedPagination>({
    active,
    initialPagination: INITIAL_PAGINATION,
    initialCursor: 1,
    fetchPage: async (page, _append) => {
      const p = new URLSearchParams({ page: String(page) });
      if (tag) p.set("tag", tag);
      if (mood) p.set("mood", mood);
      const res = await fetch(`/api/discover?${p}`);
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      return { items: data.feed, pagination: data.pagination };
    },
    getNextCursor: (p) => p.page + 1,
    resetDeps: [tag, mood],
  });

  return { songs, pagination, tag, setTag, mood, setMood, loading, loadingMore, sentinelRef };
}
