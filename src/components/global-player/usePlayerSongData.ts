import { useCallback, useEffect, useRef, useState } from "react";
import { fetchEffect } from "@/lib/fetch-effect";
import { useSession } from "next-auth/react";
import { useToast } from "../Toast";
import type { ReactionItem } from "../ReactionTimeline";
import type { TimestampedComment } from "./types";

export function usePlayerSongData(
  songId: string | undefined,
  currentTime: number,
  duration: number,
) {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [isFavorite, setIsFavorite] = useState(false);
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const [timedComments, setTimedComments] = useState<TimestampedComment[]>([]);
  const reactionSongIdRef = useRef<string | null>(null);
  const timedCommentSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!songId || !session?.user) {
      setIsFavorite(false);
      return;
    }
    return fetchEffect<{ song: { isFavorite?: boolean } }>(
      `/api/songs/${songId}`,
      (data) => setIsFavorite(data.song.isFavorite ?? false),
    );
  }, [songId, session?.user]);

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

  useEffect(() => {
    if (!songId) {
      setTimedComments([]);
      timedCommentSongIdRef.current = null;
      return;
    }
    if (timedCommentSongIdRef.current === songId) return;
    timedCommentSongIdRef.current = songId;
    setTimedComments([]);
    return fetchEffect<{ comments: { id: string; timestamp: number | null; body: string; user: { name: string | null } }[] }>(
      `/api/songs/${songId}/comments?page=1`,
      (data) => {
        const timed: TimestampedComment[] = data.comments
          .filter((c) => c.timestamp !== null)
          .map((c) => ({
            id: c.id,
            timestamp: c.timestamp as number,
            body: c.body,
            username: c.user?.name ?? null,
          }));
        setTimedComments(timed);
      },
    );
  }, [songId]);

  const handleReact = useCallback(
    async (emoji: string) => {
      if (!songId) return;
      const timestamp = Math.max(
        0,
        Math.min(currentTime, duration ?? currentTime),
      );

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
              : r,
          ),
        );
      } catch {
        setReactions((prev) => prev.filter((r) => r.id !== optimistic.id));
        toast("Couldn't save reaction. Try again.", "error");
      }
    },
    [songId, currentTime, duration, session, toast],
  );

  const handleToggleFavorite = useCallback(async () => {
    if (!songId) return;
    const prev = isFavorite;
    const newFav = !prev;
    setIsFavorite(newFav);
    try {
      const res = await fetch(`/api/songs/${songId}/favorite`, {
        method: newFav ? "POST" : "DELETE",
      });
      if (!res.ok) {
        setIsFavorite(prev);
      }
    } catch {
      setIsFavorite(prev);
    }
  }, [songId, isFavorite]);

  return {
    session,
    isFavorite,
    reactions,
    timedComments,
    handleReact,
    handleToggleFavorite,
  };
}
