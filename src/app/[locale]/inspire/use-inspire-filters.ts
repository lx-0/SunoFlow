"use client";

import { useState, useMemo, useCallback } from "react";
import type { SourceType, UnifiedFeedItem } from "./use-inspire-feed";

export type SortMode = "newest" | "bestmatch";

export function useInspireFilters(
  unifiedFeed: UnifiedFeedItem[],
  picksItems: UnifiedFeedItem[],
) {
  const [sourceFilters, setSourceFilters] = useState<Set<SourceType>>(
    new Set(["rss", "instagram", "picks", "pending"])
  );
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const toggleSourceFilter = useCallback((source: SourceType) => {
    setSourceFilters((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        if (next.size > 1) next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  }, []);

  const filteredFeed = useMemo(() => {
    let items = unifiedFeed.filter((item) => sourceFilters.has(item.sourceType));
    if (moodFilter) {
      items = items.filter((item) => item.mood === moodFilter);
    }
    if (sortMode === "newest") {
      items.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.getTime() - a.date.getTime();
      });
    }
    return items;
  }, [unifiedFeed, sourceFilters, moodFilter, sortMode]);

  const filteredPicks = useMemo(() => {
    if (!sourceFilters.has("picks")) return [];
    if (moodFilter) return picksItems.filter((item) => item.mood === moodFilter);
    return picksItems;
  }, [picksItems, sourceFilters, moodFilter]);

  return {
    sourceFilters,
    moodFilter,
    setMoodFilter,
    sortMode,
    setSortMode,
    toggleSourceFilter,
    filteredFeed,
    filteredPicks,
  };
}
