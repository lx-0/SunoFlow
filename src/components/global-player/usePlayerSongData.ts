import { useCallback, useEffect, useRef, useState } from "react";
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
    let cancelled = false;
    fetch(`/api/songs/${songId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.song)
          setIsFavorite(data.song.isFavorite ?? false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
    if (!songId) {
      setTimedComments([]);
      timedCommentSongIdRef.current = null;
      return;
    }
    if (timedCommentSongIdRef.current === songId) return;
    timedCommentSongIdRef.current = songId;
    setTimedComments([]);
    let cancelled = false;
    fetch(`/api/songs/${songId}/comments?page=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.comments) {
          const timed: TimestampedComment[] = data.comments
            .filter(
              (c: { timestamp: number | null }) => c.timestamp !== null,
            )
            .map(
              (c: {
                id: string;
                timestamp: number;
                body: string;
                user: { name: string | null };
              }) => ({
                id: c.id,
                timestamp: c.timestamp,
                body: c.body,
                username: c.user?.name ?? null,
              }),
            );
          setTimedComments(timed);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
