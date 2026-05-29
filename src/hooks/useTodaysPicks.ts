"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

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

export function useTodaysPicks({ hasRss }: { hasRss: boolean }) {
  const { toast } = useToast();
  const [picks, setPicks] = useState<InspirationDigest | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [autoGenAttempted, setAutoGenAttempted] = useState(false);

  const fetchPicks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/digests?limit=1");
      if (!res.ok) return;
      const data = await res.json();
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
      setLoading(false);
    }
  }, []);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/digests/generate", { method: "POST" });
      if (!res.ok) {
        toast("Could not generate today's picks. Please try again.", "error");
        return;
      }
      const data = await res.json();
      setPicks(data.digest ?? null);
    } catch {
      toast("Could not generate today's picks. Please try again.", "error");
    } finally {
      setGenerating(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPicks();
  }, [fetchPicks]);

  useEffect(() => {
    if (autoGenAttempted || loading || generating) return;
    if (picks === null && hasRss && !loading) {
      setAutoGenAttempted(true);
      generate();
    }
  }, [picks, hasRss, loading, generating, autoGenAttempted, generate]);

  return { picks, loading, generating, fetchPicks, generate };
}
