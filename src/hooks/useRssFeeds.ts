"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";

interface FeedItem {
  title: string;
  description: string;
  content?: string;
  link?: string;
  source?: string;
  pubDate?: string;
  mood?: string;
  topics?: string[];
  suggestedStyle?: string;
  excerpt?: string;
}

interface FeedResult {
  url: string;
  feedTitle: string;
  items: FeedItem[];
  error?: string;
}

export type { FeedItem, FeedResult };

export function useRssFeeds() {
  const [urls, setUrls] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [feeds, setFeeds] = useState<FeedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshed, setRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    apiGet<{ feeds: { url: string }[] }>("/api/rss/feeds")
      .then((data) => {
        setUrls((data.feeds ?? []).map((f) => f.url));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const fetchFeeds = useCallback(async (feedUrls: string[]) => {
    if (feedUrls.length === 0) return;
    setLoading(true);
    try {
      const data = await apiPost<{ feeds: FeedResult[] }>("/api/rss/fetch", { urls: feedUrls });
      setFeeds(data.feeds);
      setRefreshed(new Date());
    } catch {
      // keep existing feeds
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loaded || urls.length === 0) return;
    fetchFeeds(urls);
  }, [urls, loaded, fetchFeeds]);

  return { feeds, urls, loaded, loading, refreshed, fetchFeeds };
}
