"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [items, setItems] = useState<PendingFeedGenerationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/feed-generations");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const approve = useCallback(
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
        setItems((prev) => prev.filter((p) => p.id !== item.id));
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

  const dismiss = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((p) => p.id !== id));
      try {
        await fetch(`/api/feed-generations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "dismissed" }),
        });
      } catch {
        toast("Could not dismiss this item. It may reappear on refresh.", "error");
        fetchItems();
      }
    },
    [fetchItems, toast]
  );

  return { items, loading, fetchItems, approve, dismiss };
}
