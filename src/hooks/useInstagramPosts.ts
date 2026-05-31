"use client";

import { useCallback, useEffect, useState } from "react";
import { apiPost } from "@/lib/api-client";

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

export type { InstagramPost };

const IG_POSTS_KEY = "sunoflow_ig_posts";
const IG_CACHE_KEY = "sunoflow_ig_cache";

export function useInstagramPosts() {
  const [urls, setUrls] = useState<string[]>([]);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshed, setRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(IG_POSTS_KEY);
      setUrls(stored ? JSON.parse(stored) : []);
    } catch {
      setUrls([]);
    }
  }, []);

  const loadCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(IG_CACHE_KEY);
      if (cached) {
        const { posts: cachedPosts, timestamp } = JSON.parse(cached);
        setPosts(cachedPosts);
        setRefreshed(new Date(timestamp));
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }, []);

  const fetchPosts = useCallback(async (igUrls: string[]) => {
    if (igUrls.length === 0) return;
    setLoading(true);
    try {
      const data = await apiPost<{ posts: InstagramPost[] }>("/api/instagram/fetch", { urls: igUrls });
      setPosts(data.posts);
      const now = new Date();
      setRefreshed(now);
      try {
        localStorage.setItem(
          IG_CACHE_KEY,
          JSON.stringify({ posts: data.posts, timestamp: now.toISOString() })
        );
      } catch {
        // storage quota
      }
    } catch {
      // keep existing posts
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urls.length === 0) return;
    loadCache();
    fetchPosts(urls);
  }, [urls, loadCache, fetchPosts]);

  return { posts, urls, loading, refreshed, fetchPosts };
}
