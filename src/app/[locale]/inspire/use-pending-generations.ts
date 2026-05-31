"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { apiGet, apiPost, apiPatch } from "@/lib/api-client";

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
      const data = await apiGet<{ items?: PendingFeedGenerationItem[] }>("/api/feed-generations");
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
        const data = await apiPost<{ prompt?: string; style?: string }>(`/api/feed-generations/${item.id}/approve`, {});
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
      await apiPatch(`/api/feed-generations/${id}`, { status: "dismissed" });
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
