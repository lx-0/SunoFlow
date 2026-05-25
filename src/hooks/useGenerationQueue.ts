"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { QueueItem } from "@/lib/generation-queue/client";
import {
  addQueueItem,
  fetchQueueItems,
  processNextQueueItem,
  reorderQueueItems,
  removeQueueItem,
} from "@/lib/generation-queue/client";

export function useGenerationQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const itemsRef = useRef<QueueItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const fetchQueue = useCallback(async () => {
    try {
      const data = await fetchQueueItems();
      setItems(data.items);
      const hasProcessing = data.items.some((i) => i.status === "processing");
      setIsProcessing(hasProcessing);
      processingRef.current = hasProcessing;
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const addToQueue = useCallback(
    async (params: {
      prompt: string;
      title?: string;
      tags?: string;
      makeInstrumental?: boolean;
      personaId?: string;
    }): Promise<{ item?: QueueItem; error?: string }> => {
      try {
        const data = await addQueueItem(params);
        setItems((prev) => [...prev, data.item]);
        return { item: data.item };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "Failed to add to queue" };
      }
    },
    []
  );

  const removeFromQueue = useCallback(async (id: string) => {
    try {
      await removeQueueItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // Non-critical
    }
  }, []);

  const reorderQueue = useCallback(async (orderedIds: string[]) => {
    // Optimistic update
    setItems((prev) => {
      const map = new Map(prev.map((i) => [i.id, i]));
      const reordered: QueueItem[] = [];
      for (const id of orderedIds) {
        const item = map.get(id);
        if (item) reordered.push({ ...item, position: reordered.length });
      }
      // Append any items not in orderedIds (e.g., processing)
      for (const item of prev) {
        if (!orderedIds.includes(item.id)) {
          reordered.push(item);
        }
      }
      return reordered;
    });

    try {
      await reorderQueueItems(orderedIds);
    } catch {
      // Revert on error
      await fetchQueue();
    }
  }, [fetchQueue]);

  const processNext = useCallback(async (): Promise<{
    item?: QueueItem;
    song?: { id: string; title: string | null };
    error?: string;
  }> => {
    if (processingRef.current) return { error: "Already processing" };
    processingRef.current = true;
    setIsProcessing(true);

    try {
      const data = await processNextQueueItem();
      if (!data.item) {
        processingRef.current = false;
        setIsProcessing(false);
        return {};
      }

      // Update local state
      setItems((prev) =>
        prev.map((i) =>
          i.id === data.item.id ? { ...i, ...data.item } : i
        )
      );

      return { item: data.item, song: data.song };
    } catch (error) {
      processingRef.current = false;
      setIsProcessing(false);
      return { error: error instanceof Error ? error.message : "Failed to process queue" };
    }
  }, []);

  const onGenerationComplete = useCallback(
    async (songId: string) => {
      // Update local item status
      setItems((prev) =>
        prev.map((i) =>
          i.songId === songId && i.status === "processing"
            ? { ...i, status: "done" as const }
            : i
        )
      );
      processingRef.current = false;
      setIsProcessing(false);

      // Auto-process next
      const pendingItems = itemsRef.current.filter((i) => i.status === "pending");
      if (pendingItems.length > 0) {
        return processNext();
      }
      return null;
    },
    [processNext]
  );

  const pendingCount = useMemo(
    () => items.filter((i) => i.status === "pending").length,
    [items]
  );
  const processingItem = useMemo(
    () => items.find((i) => i.status === "processing"),
    [items]
  );
  const totalActive = useMemo(
    () =>
      items.filter(
        (i) => i.status === "pending" || i.status === "processing"
      ).length,
    [items]
  );

  return {
    items,
    pendingCount,
    processingItem,
    totalActive,
    isProcessing,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    processNext,
    onGenerationComplete,
    fetchQueue,
  };
}
