"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/Toast";
import type { ReactionItem } from "@/components/ReactionTimeline";

export interface EmojiPopup {
  id: string;
  emoji: string;
  key: number;
  leftPct: number;
}

export function useReactionPopups(
  songId: string,
  currentTime: number,
  audioDuration: number,
  isPlaying: boolean
) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const [activePopups, setActivePopups] = useState<EmojiPopup[]>([]);
  const shownReactionIdsRef = useRef<Set<string>>(new Set());
  const popupKeyRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/songs/${songId}/reactions`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.reactions) setReactions(data.reactions);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [songId]);

  useEffect(() => {
    if (!isPlaying || reactions.length === 0 || audioDuration <= 0) return;
    const newlyTriggered = reactions.filter(
      (r) => r.timestamp <= currentTime && !shownReactionIdsRef.current.has(r.id)
    );
    if (newlyTriggered.length === 0) return;
    for (const r of newlyTriggered) {
      shownReactionIdsRef.current.add(r.id);
    }
    const newPopups: EmojiPopup[] = newlyTriggered.map((r) => {
      const key = ++popupKeyRef.current;
      const leftPct = Math.min(98, Math.max(2, (r.timestamp / audioDuration) * 100));
      return { id: r.id, emoji: r.emoji, key, leftPct };
    });
    setActivePopups((prev) => [...prev, ...newPopups]);
    const ids = newPopups.map((p) => p.key);
    const timer = setTimeout(() => {
      setActivePopups((prev) => prev.filter((p) => !ids.includes(p.key)));
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, isPlaying]);

  const handleReact = useCallback(
    async (emoji: string) => {
      const timestamp = Math.max(0, Math.min(currentTime, audioDuration || currentTime));

      const optimistic: ReactionItem = {
        id: `optimistic-${Date.now()}`,
        emoji,
        timestamp,
        userId: session?.user?.id ?? "",
        username: session?.user?.name ?? undefined,
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
            r.id === optimistic.id
              ? { ...created, username: session?.user?.name ?? undefined }
              : r
          )
        );
      } catch {
        setReactions((prev) => prev.filter((r) => r.id !== optimistic.id));
        toast("Couldn't save reaction. Try again.", "error");
      }
    },
    [songId, currentTime, audioDuration, session, toast]
  );

  const resetReactions = useCallback(() => {
    shownReactionIdsRef.current = new Set();
    setActivePopups([]);
  }, []);

  return {
    reactions,
    activePopups,
    shownReactionIdsRef,
    handleReact,
    resetReactions,
  };
}
