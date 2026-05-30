"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchEffect } from "@/lib/fetch-effect";

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
  const [activeCommentPopups, setActiveCommentPopups] = useState<CommentPopup[]>([]);
  const timedCommentSongIdRef = useRef<string | null>(null);
  const shownCommentIdsRef = useRef<Set<string>>(new Set());
  const commentPopupKeyRef = useRef(0);

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

  useEffect(() => {
    shownCommentIdsRef.current = new Set();
    setActiveCommentPopups([]);
  }, [songId]);

  useEffect(() => {
    if (!isPlaying || timedComments.length === 0 || duration <= 0) return;
    const newlyTriggered = timedComments.filter(
      (c) => c.timestamp <= currentTime && !shownCommentIdsRef.current.has(c.id),
    );
    if (newlyTriggered.length === 0) return;
    for (const c of newlyTriggered) {
      shownCommentIdsRef.current.add(c.id);
    }
    const newPopups: CommentPopup[] = newlyTriggered.map((c) => {
      const key = ++commentPopupKeyRef.current;
      const leftPct = Math.min(95, Math.max(5, (c.timestamp / duration) * 100));
      return { id: c.id, body: c.body, username: c.username, key, leftPct };
    });
    setActiveCommentPopups((prev) => [...prev, ...newPopups]);
    const keys = newPopups.map((p) => p.key);
    const timer = setTimeout(() => {
      setActiveCommentPopups((prev) => prev.filter((p) => !keys.includes(p.key)));
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, isPlaying]);

  const resetPlayback = useCallback(() => {
    shownCommentIdsRef.current = new Set();
    setActiveCommentPopups([]);
  }, []);

  return {
    timedComments,
    activeCommentPopups,
    resetPlayback,
  };
}
