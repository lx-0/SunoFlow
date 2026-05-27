"use client";

import { useEffect, useState, useCallback } from "react";

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

function useDbFeedUrls() {
  const [urls, setUrls] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
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
  return { urls, loaded };
}

export type { FeedItem, FeedResult };

export function useRssFeeds() {
  const { urls: feedUrls, loaded: feedsLoaded } = useDbFeedUrls();

  const [feeds, setFeeds] = useState<FeedResult[]>([]);
  const [rssLoading, setRssLoading] = useState(false);
  const [rssRefreshed, setRssRefreshed] = useState<Date | null>(null);

  const fetchRssFeeds = useCallback(async (urls: string[]) => {
    if (urls.length === 0) return;
    setRssLoading(true);
    try {
      const res = await fetch("/api/rss/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setFeeds(data.feeds);
      setRssRefreshed(new Date());
    } catch {
      // keep existing feeds
    } finally {
      setRssLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!feedsLoaded || feedUrls.length === 0) return;
    fetchRssFeeds(feedUrls);
  }, [feedUrls, feedsLoaded, fetchRssFeeds]);

  const refresh = useCallback(() => fetchRssFeeds(feedUrls), [fetchRssFeeds, feedUrls]);

  return {
    feeds,
    feedUrls,
    feedsLoaded,
    rssLoading,
    rssRefreshed,
    refresh,
    hasRss: feedUrls.length > 0,
  };
}
