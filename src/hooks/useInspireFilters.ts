"use client";

import { useCallback, useMemo, useState } from "react";
import type { FeedItem, FeedResult } from "./useRssFeeds";
import type { InstagramPost } from "./useInstagramPosts";
import type { PendingFeedGenerationItem } from "./usePendingGenerations";
import type { InspirationDigest } from "./useTodaysPicks";

export type SourceType = "rss" | "instagram" | "picks" | "pending";
export type SortMode = "newest" | "bestmatch";

export interface UnifiedFeedItem {
  id: string;
  sourceType: SourceType;
  title: string;
  subtitle?: string;
  excerpt?: string;
  mood?: string;
  topics?: string[];
  link?: string;
  imageUrl?: string;
  sourceName?: string;
  date?: Date;
  suggestedStyle?: string;
  original: unknown;
}

interface UseInspireFiltersOptions {
  feeds: FeedResult[];
  igPosts: InstagramPost[];
  pendingGenerations: PendingFeedGenerationItem[];
  picks: InspirationDigest | null;
}

export function useInspireFilters({
  feeds,
  igPosts,
  pendingGenerations,
  picks,
}: UseInspireFiltersOptions) {
  const [sourceFilters, setSourceFilters] = useState<Set<SourceType>>(
    new Set(["rss", "instagram", "picks", "pending"])
  );
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const picksItems = useMemo((): UnifiedFeedItem[] => {
    if (!picks) return [];
    return picks.items.map((item, i) => ({
      id: `picks-${picks.id}-${i}`,
      sourceType: "picks" as SourceType,
      title: item.title,
      excerpt: item.suggestedPrompt,
      mood: item.mood,
      topics: item.topics,
      link: item.link,
      sourceName: item.feedTitle || "Today's Picks",
      date: new Date(picks.createdAt),
      original: item,
    }));
  }, [picks]);

  const unifiedFeed = useMemo(() => {
    const items: UnifiedFeedItem[] = [];

    for (const feed of feeds) {
      if (feed.error) continue;
      for (const item of feed.items) {
        items.push({
          id: `rss-${item.link || item.title}-${feed.feedTitle}`,
          sourceType: "rss",
          title: item.title,
          excerpt: item.excerpt || item.description,
          mood: item.mood,
          topics: item.topics,
          link: item.link,
          sourceName: item.source || feed.feedTitle,
          date: item.pubDate ? new Date(item.pubDate) : undefined,
          suggestedStyle: item.suggestedStyle,
          original: item,
        });
      }
    }

    for (let i = 0; i < igPosts.length; i++) {
      const post = igPosts[i];
      if (post.error) continue;
      items.push({
        id: `ig-${post.url}-${i}`,
        sourceType: "instagram",
        title: post.title || "Instagram post",
        subtitle: `@${post.authorName}`,
        mood: post.mood,
        topics: post.hashtags?.slice(0, 4),
        link: post.url,
        imageUrl: post.thumbnailUrl,
        sourceName: `@${post.authorName}`,
        date: undefined,
        original: post,
      });
    }

    for (const item of pendingGenerations) {
      const styleParts = item.style?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
      const moodKey = styleParts[0]?.toLowerCase();
      items.push({
        id: `pending-${item.id}`,
        sourceType: "pending",
        title: item.itemTitle,
        excerpt: item.prompt,
        mood: moodKey,
        sourceName: item.feedTitle || "Auto-generated",
        date: new Date(item.createdAt),
        original: item,
      });
    }

    return items;
  }, [feeds, igPosts, pendingGenerations]);

  const availableSources = useMemo(() => {
    const sources: SourceType[] = [];
    if (feeds.some((f) => !f.error && f.items.length > 0)) sources.push("rss");
    if (igPosts.some((p) => !p.error)) sources.push("instagram");
    if (picks && picks.items.length > 0) sources.push("picks");
    if (pendingGenerations.length > 0) sources.push("pending");
    return sources;
  }, [feeds, igPosts, picks, pendingGenerations]);

  const allMoods = useMemo(() => {
    const allItems = [...unifiedFeed, ...picksItems];
    return Array.from(
      new Set(
        allItems
          .map((i) => i.mood)
          .filter((m): m is string => !!m && m !== "neutral")
      )
    ).sort();
  }, [unifiedFeed, picksItems]);

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

  return {
    sourceFilters,
    moodFilter,
    setMoodFilter,
    sortMode,
    setSortMode,
    availableSources,
    allMoods,
    filteredFeed,
    filteredPicks,
    toggleSourceFilter,
  };
}
