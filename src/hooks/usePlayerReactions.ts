"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReactionItem } from "@/components/ReactionTimeline";
import { fetchEffect } from "@/lib/fetch-effect";
import { useTimedPopups } from "@/hooks/useTimedPopups";

interface EmojiPopup {
  id: string;
  emoji: string;
  key: number;
  leftPct: number;
}

interface UsePlayerReactionsOptions {
  songId: string | undefined;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  userId?: string;
  userName?: string | null;
  toast: (message: string, variant?: "success" | "error" | "info") => void;
}

export function usePlayerReactions({
  songId,
  currentTime,
  duration,
  isPlaying,
  userId,
  userName,
  toast,
}: UsePlayerReactionsOptions) {
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const [showReactions, setShowReactions] = useState(false);
  const reactionSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!songId) {
      setReactions([]);
      reactionSongIdRef.current = null;
      return;
    }
    if (reactionSongIdRef.current === songId) return;
    reactionSongIdRef.current = songId;
    setReactions([]);
    return fetchEffect<{ reactions: ReactionItem[] }>(
      `/api/songs/${songId}/reactions`,
      (data) => setReactions(data.reactions),
    );
  }, [songId]);

  const { activePopups, reset: resetPopups } = useTimedPopups<ReactionItem, EmojiPopup>({
    items: reactions,
    currentTime,
    duration,
    isPlaying,
    displayDurationMs: 2000,
    makePopup: (r, key, leftPct) => ({ id: r.id, emoji: r.emoji, key, leftPct }),
  });

  useEffect(() => {
    if (!isPlaying) setShowReactions(false);
  }, [isPlaying]);

  const handleReact = useCallback(
    async (emoji: string) => {
      if (!songId) return;
      const timestamp = Math.max(0, Math.min(currentTime, duration ?? currentTime));

      const optimistic: ReactionItem = {
        id: `optimistic-${Date.now()}`,
        emoji,
        timestamp,
        userId: userId ?? "",
        username: userName ?? undefined,
      };
      setReactions((prev) => [...prev, optimistic]);

      try {
        const res = await fetch(`/api/songs/${songId}/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji, timestamp }),
        });

        if (res.status === 429) {
          setReactions((prev) => prev.filter((r) => r.id !== optimistic.id));
          toast("Slow down! Too many reactions.", "info");
          return;
        }

        if (!res.ok) {
          setReactions((prev) => prev.filter((r) => r.id !== optimistic.id));
          toast("Couldn't save reaction. Try again.", "error");
          return;
        }

        const created: ReactionItem = await res.json();
        setReactions((prev) =>
          prev.map((r) =>
            r.id === optimistic.id ? { ...created, username: userName ?? undefined } : r,
          ),
        );
      } catch {
        setReactions((prev) => prev.filter((r) => r.id !== optimistic.id));
        toast("Couldn't save reaction. Try again.", "error");
      }
    },
    [songId, currentTime, duration, userId, userName, toast],
  );

  const resetPlayback = useCallback(() => {
    resetPopups();
  }, [resetPopups]);

  return {
    reactions,
    activePopups,
    showReactions,
    setShowReactions,
    handleReact,
    resetPlayback,
  };
}
