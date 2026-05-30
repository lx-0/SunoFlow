"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchEffect } from "@/lib/fetch-effect";
import { useTimedPopups } from "@/hooks/useTimedPopups";

interface TimestampedComment {
  id: string;
  timestamp: number;
  body: string;
  username: string | null;
}

export interface CommentPopup {
  id: string;
  body: string;
  username: string | null;
  key: number;
  leftPct: number;
}

interface UsePlayerCommentsOptions {
  songId: string | undefined;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

export function usePlayerComments({
  songId,
  currentTime,
  duration,
  isPlaying,
}: UsePlayerCommentsOptions) {
  const [timedComments, setTimedComments] = useState<TimestampedComment[]>([]);
  const timedCommentSongIdRef = useRef<string | null>(null);

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

  const { activePopups: activeCommentPopups, reset: resetPopups } = useTimedPopups<TimestampedComment, CommentPopup>({
    items: timedComments,
    currentTime,
    duration,
    isPlaying,
    displayDurationMs: 3000,
    makePopup: (c, key, leftPct) => ({ id: c.id, body: c.body, username: c.username, key, leftPct }),
    leftPctBounds: { min: 5, max: 95 },
  });

  const resetPlayback = useCallback(() => {
    resetPopups();
  }, [resetPopups]);

  return {
    timedComments,
    activeCommentPopups,
    resetPlayback,
  };
}
