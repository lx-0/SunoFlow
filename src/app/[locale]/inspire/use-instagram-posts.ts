"use client";

import { useEffect, useState, useCallback } from "react";

const IG_POSTS_KEY = "sunoflow_ig_posts";
const IG_CACHE_KEY = "sunoflow_ig_cache";

interface InstagramPost {
  url: string;
  authorName: string;
  title: string;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  hashtags: string[];
  mood: string;
  promptSuggestion: string;
  error?: string;
}

function useStoredUrls(key: string) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      setUrls(stored ? JSON.parse(stored) : []);
    } catch {
      setUrls([]);
    }
  }, [key]);
  return urls;
}

export type { InstagramPost };

export function useInstagramPosts() {
  const igUrls = useStoredUrls(IG_POSTS_KEY);

  const [igPosts, setIgPosts] = useState<InstagramPost[]>([]);
  const [igLoading, setIgLoading] = useState(false);
  const [igRefreshed, setIgRefreshed] = useState<Date | null>(null);

  const loadIgCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(IG_CACHE_KEY);
      if (cached) {
        const { posts, timestamp } = JSON.parse(cached);
        setIgPosts(posts);
        setIgRefreshed(new Date(timestamp));
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }, []);

  const fetchIgPosts = useCallback(async (urls: string[]) => {
    if (urls.length === 0) return;
    setIgLoading(true);
    try {
      const res = await fetch("/api/instagram/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setIgPosts(data.posts);
      const now = new Date();
      setIgRefreshed(now);
      try {
        localStorage.setItem(
          IG_CACHE_KEY,
          JSON.stringify({ posts: data.posts, timestamp: now.toISOString() })
        );
      } catch {
        // storage quota — ignore
      }
    } catch {
      // keep existing posts
    } finally {
      setIgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (igUrls.length === 0) return;
    loadIgCache();
    fetchIgPosts(igUrls);
  }, [igUrls, loadIgCache, fetchIgPosts]);

  const refresh = useCallback(() => fetchIgPosts(igUrls), [fetchIgPosts, igUrls]);

  return {
    igPosts,
    igUrls,
    igLoading,
    igRefreshed,
    refresh,
    hasIg: igUrls.length > 0,
  };
}
