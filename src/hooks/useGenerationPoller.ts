"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type GenerationStatus = "pending" | "processing" | "ready" | "failed";

export interface GenerationState {
  songId: string;
  status: GenerationStatus;
  title: string | null;
  errorMessage: string | null;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40;

/**
 * Polls /api/songs/{id}/status until the song reaches a terminal state.
 * Returns the current status for each tracked song.
 */
export function useGenerationPoller() {
  const [songs, setSongs] = useState<GenerationState[]>([]);
  const activeRef = useRef(true);
  const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map()
  );
  const pollCountRef = useRef<Map<string, number>>(new Map());

  const stopPolling = useCallback((songId: string) => {
    const interval = intervalsRef.current.get(songId);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(songId);
    }
    pollCountRef.current.delete(songId);
  }, []);

  const pollSong = useCallback(
    async (songId: string) => {
      if (!activeRef.current) return;

      const count = (pollCountRef.current.get(songId) ?? 0) + 1;
      pollCountRef.current.set(songId, count);

      if (count > MAX_POLLS) {
        setSongs((prev) =>
          prev.map((s) =>
            s.songId === songId
              ? { ...s, status: "failed", errorMessage: "Generation timed out" }
              : s
          )
        );
        stopPolling(songId);
        return;
      }

      try {
        const res = await fetch(`/api/songs/${songId}/status`);
        if (!res.ok) return;

        const data = await res.json();
        const info = data.song ?? data;
        const newStatus: GenerationStatus =
          info.generationStatus === "ready"
            ? "ready"
            : info.generationStatus === "failed"
              ? "failed"
              : info.pollCount > 0
                ? "processing"
                : "pending";

        setSongs((prev) =>
          prev.map((s) =>
            s.songId === songId
              ? {
                  ...s,
                  status: newStatus,
                  title: info.title ?? s.title,
                  errorMessage: info.errorMessage ?? null,
                }
              : s
          )
        );

        if (newStatus === "ready" || newStatus === "failed") {
          stopPolling(songId);
        }
      } catch {
        // Network error — keep polling
      }
    },
    [stopPolling]
  );

  const trackSong = useCallback(
    (songId: string, title: string | null) => {
      if (!songId) return;
      setSongs((prev) => {
        if (prev.some((s) => s.songId === songId)) return prev;
        return [
          ...prev,
          { songId, status: "pending", title, errorMessage: null },
        ];
      });

      pollCountRef.current.set(songId, 0);
      const interval = setInterval(() => pollSong(songId), POLL_INTERVAL_MS);
      intervalsRef.current.set(songId, interval);

      // First poll immediately
      pollSong(songId);
    },
    [pollSong]
  );

  const clearAll = useCallback(() => {
    Array.from(intervalsRef.current.keys()).forEach((songId) => {
      stopPolling(songId);
    });
    setSongs([]);
  }, [stopPolling]);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      Array.from(intervalsRef.current.values()).forEach((interval) => {
        clearInterval(interval);
      });
      intervalsRef.current.clear();
      pollCountRef.current.clear();
    };
  }, []);

  return { songs, trackSong, clearAll };
}
