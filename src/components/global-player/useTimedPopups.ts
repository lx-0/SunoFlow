import { useEffect, useRef, useState } from "react";
import type { ReactionItem } from "../ReactionTimeline";
import type { TimestampedComment, EmojiPopup, CommentPopup } from "./types";

export function useTimedPopups(
  isPlaying: boolean,
  duration: number,
  currentTime: number,
  reactions: ReactionItem[],
  timedComments: TimestampedComment[],
  songId: string | undefined,
) {
  const [activePopups, setActivePopups] = useState<EmojiPopup[]>([]);
  const [activeCommentPopups, setActiveCommentPopups] = useState<
    CommentPopup[]
  >([]);
  const shownReactionIdsRef = useRef<Set<string>>(new Set());
  const shownCommentIdsRef = useRef<Set<string>>(new Set());
  const popupKeyRef = useRef(0);
  const commentPopupKeyRef = useRef(0);

  useEffect(() => {
    shownReactionIdsRef.current = new Set();
    setActivePopups([]);
  }, [songId]);

  useEffect(() => {
    shownCommentIdsRef.current = new Set();
    setActiveCommentPopups([]);
  }, [songId]);

  useEffect(() => {
    if (!isPlaying || reactions.length === 0 || duration <= 0) return;
    const newlyTriggered = reactions.filter(
      (r) =>
        r.timestamp <= currentTime && !shownReactionIdsRef.current.has(r.id),
    );
    if (newlyTriggered.length === 0) return;
    for (const r of newlyTriggered) {
      shownReactionIdsRef.current.add(r.id);
    }
    const newPopups: EmojiPopup[] = newlyTriggered.map((r) => {
      const key = ++popupKeyRef.current;
      const leftPct = Math.min(
        98,
        Math.max(2, (r.timestamp / duration) * 100),
      );
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

  useEffect(() => {
    if (!isPlaying || timedComments.length === 0 || duration <= 0) return;
    const newlyTriggered = timedComments.filter(
      (c) =>
        c.timestamp <= currentTime && !shownCommentIdsRef.current.has(c.id),
    );
    if (newlyTriggered.length === 0) return;
    for (const c of newlyTriggered) {
      shownCommentIdsRef.current.add(c.id);
    }
    const newPopups: CommentPopup[] = newlyTriggered.map((c) => {
      const key = ++commentPopupKeyRef.current;
      const leftPct = Math.min(
        95,
        Math.max(5, (c.timestamp / duration) * 100),
      );
      return { id: c.id, body: c.body, username: c.username, key, leftPct };
    });
    setActiveCommentPopups((prev) => [...prev, ...newPopups]);
    const keys = newPopups.map((p) => p.key);
    const timer = setTimeout(() => {
      setActiveCommentPopups((prev) =>
        prev.filter((p) => !keys.includes(p.key)),
      );
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, isPlaying]);

  return { activePopups, activeCommentPopups };
}
