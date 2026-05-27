"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

export function useCommentPopups(
  songId: string,
  currentTime: number,
  audioDuration: number,
  isPlaying: boolean
) {
  const [timedComments, setTimedComments] = useState<TimestampedComment[]>([]);
  const [activeCommentPopups, setActiveCommentPopups] = useState<CommentPopup[]>([]);
  const shownCommentIdsRef = useRef<Set<string>>(new Set());
  const commentPopupKeyRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/songs/${songId}/comments?page=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.comments) {
          const timed: TimestampedComment[] = data.comments
            .filter((c: { timestamp: number | null }) => c.timestamp !== null)
            .map((c: { id: string; timestamp: number; body: string; user: { name: string | null } }) => ({
              id: c.id,
              timestamp: c.timestamp,
              body: c.body,
              username: c.user?.name ?? null,
            }));
          setTimedComments(timed);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  useEffect(() => {
    if (!isPlaying || timedComments.length === 0 || audioDuration <= 0) return;
    const newlyTriggered = timedComments.filter(
      (c) => c.timestamp <= currentTime && !shownCommentIdsRef.current.has(c.id)
    );
    if (newlyTriggered.length === 0) return;
    for (const c of newlyTriggered) {
      shownCommentIdsRef.current.add(c.id);
    }
    const newPopups: CommentPopup[] = newlyTriggered.map((c) => {
      const key = ++commentPopupKeyRef.current;
      const leftPct = Math.min(95, Math.max(5, (c.timestamp / audioDuration) * 100));
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

  const resetComments = useCallback(() => {
    shownCommentIdsRef.current = new Set();
    setActiveCommentPopups([]);
  }, []);

  return {
    timedComments,
    activeCommentPopups,
    shownCommentIdsRef,
    resetComments,
  };
}
