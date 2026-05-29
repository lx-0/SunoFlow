"use client";

import { useCallback, useEffect, useState } from "react";

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
    fetch("/api/rss/feeds")
      .then((r) => r.json())
      .then((data) => {
        const feedUrls = (data.feeds ?? []).map((f: { url: string }) => f.url);
        setUrls(feedUrls);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const fetchFeeds = useCallback(async (feedUrls: string[]) => {
    if (feedUrls.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/rss/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: feedUrls }),
      });
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
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
