"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { apiGet, apiPost } from "@/lib/api-client";

interface DigestItem {
  source: "rss";
  title: string;
  link?: string;
  mood: string;
  topics: string[];
  suggestedPrompt: string;
  feedTitle?: string;
}

interface InspirationDigest {
  id: string;
  title: string;
  items: DigestItem[];
  createdAt: string;
}

export type { DigestItem, InspirationDigest };

export function useTodaysPicks(hasRss: boolean) {
  const { toast } = useToast();

  const [picks, setPicks] = useState<InspirationDigest | null>(null);
  const [picksLoading, setPicksLoading] = useState(false);
  const [picksGenerating, setPicksGenerating] = useState(false);
  const [autoGenAttempted, setAutoGenAttempted] = useState(false);

  const fetchTodaysPicks = useCallback(async () => {
    setPicksLoading(true);
    try {
      const data = await apiGet<{ digests?: InspirationDigest[] }>("/api/digests?limit=1");
      const latest = data.digests?.[0] ?? null;
      if (latest) {
        const picksDate = new Date(latest.createdAt);
        const today = new Date();
        const isToday =
          picksDate.getFullYear() === today.getFullYear() &&
          picksDate.getMonth() === today.getMonth() &&
          picksDate.getDate() === today.getDate();
        setPicks(isToday ? latest : null);
      } else {
        setPicks(null);
      }
    } catch {
      // ignore
    } finally {
      setPicksLoading(false);
    }
  }, []);

  const generatePicks = useCallback(async () => {
    setPicksGenerating(true);
    try {
      const data = await apiPost<{ digest?: InspirationDigest }>("/api/digests/generate", {});
      setPicks(data.digest ?? null);
    } catch {
      toast("Could not generate today's picks. Please try again.", "error");
    } finally {
      setPicksGenerating(false);
    }
  }, [toast]);

  useEffect(() => {
    if (autoGenAttempted || picksLoading || picksGenerating) return;
    if (picks === null && hasRss && !picksLoading) {
      setAutoGenAttempted(true);
      generatePicks();
    }
  }, [picks, hasRss, picksLoading, picksGenerating, autoGenAttempted, generatePicks]);

  useEffect(() => {
    fetchTodaysPicks();
  }, [fetchTodaysPicks]);

  return {
    picks,
    picksLoading,
    picksGenerating,
    refresh: fetchTodaysPicks,
    generatePicks,
  };
}
