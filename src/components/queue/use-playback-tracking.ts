"use client";

import { useCallback, useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import { fetchWithTimeout } from "@/lib/fetch-client";

export function usePlaybackTracking() {
  const lastTrackedSongRef = useRef<string | null>(null);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trackPlay = useCallback((songId: string) => {
    if (lastTrackedSongRef.current === songId) return;
    lastTrackedSongRef.current = songId;

    fetchWithTimeout(`/api/songs/${songId}/play`, { method: "POST" }).catch(() => {});
    track("song_played");

    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      fetchWithTimeout("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      }).catch(() => {});
    }, 5_000);
  }, []);

  const clearHistoryTimer = useCallback(() => {
    if (!historyTimerRef.current) return;
    clearTimeout(historyTimerRef.current);
    historyTimerRef.current = null;
  }, []);

  useEffect(() => () => clearHistoryTimer(), [clearHistoryTimer]);

  return {
    trackPlay,
    clearHistoryTimer,
  };
}
