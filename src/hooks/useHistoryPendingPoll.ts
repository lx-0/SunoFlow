"use client";

import { useEffect } from "react";
import { pollSongStatus } from "@/components/generation-history/retry-client";

interface PollableSong {
  id: string;
  generationStatus: string;
}

export function useHistoryPendingPoll(
  songs: PollableSong[],
  mergeSongUpdate: (update: { id: string; [key: string]: unknown }) => void,
) {
  const pendingKey = songs
    .filter((s) => s.generationStatus === "pending")
    .map((s) => s.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (!pendingKey) return;
    const ids = pendingKey.split(",");
    let cancelled = false;

    const tick = async () => {
      const results = await Promise.all(ids.map((id) => pollSongStatus(id, { fetch })));
      if (cancelled) return;
      for (const r of results) {
        if (r.kind === "ok") {
          mergeSongUpdate(r.song as { id: string; [key: string]: unknown });
        }
      }
    };

    void tick();
    const interval = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pendingKey, mergeSongUpdate]);
}
