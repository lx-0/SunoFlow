"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { retrySong, mergeSongIntoList } from "@/components/generation-history/retry-client";

interface GenerationEntry {
  id: string;
  title: string | null;
  prompt: string | null;
  tags: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  generationStatus: string;
  errorMessage: string | null;
  isInstrumental: boolean;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useHistoryRetry(
  setSongs: React.Dispatch<React.SetStateAction<GenerationEntry[]>>,
) {
  const { toast } = useToast();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const mergeSongUpdate = useCallback(
    (update: Partial<GenerationEntry> & { id: string }) => {
      setSongs((prev) => mergeSongIntoList(prev, update));
    },
    [setSongs],
  );

  const handleRetry = useCallback(
    async (entry: GenerationEntry) => {
      if (retryingId) return;
      setRetryingId(entry.id);
      const result = await retrySong(entry.id, { fetch });
      switch (result.kind) {
        case "ok":
          mergeSongUpdate(result.song as Partial<GenerationEntry> & { id: string });
          toast("Retry started! Song is regenerating.", "success");
          break;
        case "soft-error":
          if (result.song) mergeSongUpdate(result.song as Partial<GenerationEntry> & { id: string });
          toast(result.message, "error");
          break;
        case "rate-limit":
          toast(
            `Rate limit reached. Try again in ${result.minutesUntilReset} minute${result.minutesUntilReset === 1 ? "" : "s"}.`,
            "error",
          );
          break;
        case "error":
          toast(result.message, "error");
          break;
        case "network-error":
          toast("Network error. Please check your connection.", "error");
          break;
      }
      setRetryingId(null);
    },
    [retryingId, mergeSongUpdate, toast],
  );

  return { retryingId, handleRetry, mergeSongUpdate };
}
