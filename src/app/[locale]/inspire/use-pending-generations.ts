"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

interface PendingFeedGenerationItem {
  id: string;
  feedTitle?: string | null;
  itemTitle: string;
  itemLink?: string | null;
  prompt: string;
  style?: string | null;
  status: string;
  createdAt: string;
}

export type { PendingFeedGenerationItem };

export function usePendingGenerations() {
  const router = useRouter();
  const { toast } = useToast();

  const [pendingGenerations, setPendingGenerations] = useState<PendingFeedGenerationItem[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);

  const fetchPendingGenerations = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await fetch("/api/feed-generations");
      if (!res.ok) return;
      const data = await res.json();
      setPendingGenerations(data.items ?? []);
    } catch {
      // ignore
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const handleApprovePending = useCallback(
    async (item: PendingFeedGenerationItem) => {
      try {
        const res = await fetch(`/api/feed-generations/${item.id}/approve`, { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          toast(
            data?.error ?? "Could not open this suggested item. Please try again.",
            "error",
          );
          return;
        }
        const data = await res.json();
        setPendingGenerations((prev) => prev.filter((p) => p.id !== item.id));
        const params = new URLSearchParams();
        if (data.prompt) params.set("prompt", data.prompt);
        if (data.style) params.set("tags", data.style);
        router.push(`/generate?${params.toString()}`);
      } catch {
        toast("Could not open this suggested item. Please try again.", "error");
      }
    },
    [router, toast]
  );

  const handleDismissPending = useCallback(async (id: string) => {
    setPendingGenerations((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`/api/feed-generations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
    } catch {
      toast("Could not dismiss this item. It may reappear on refresh.", "error");
      fetchPendingGenerations();
    }
  }, [fetchPendingGenerations, toast]);

  useEffect(() => {
    fetchPendingGenerations();
  }, [fetchPendingGenerations]);

  return {
    pendingGenerations,
    pendingLoading,
    refresh: fetchPendingGenerations,
    handleApprovePending,
    handleDismissPending,
  };
}
