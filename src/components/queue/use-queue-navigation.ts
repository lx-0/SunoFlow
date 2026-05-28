"use client";

import { useCallback, type MutableRefObject } from "react";
import type { QueueSong, RepeatMode } from "@/components/queue/queue-context-types";

type UseQueueNavigationParams = {
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  queueRef: MutableRefObject<QueueSong[]>;
  currentIndexRef: MutableRefObject<number>;
  scheduleSyncRef: MutableRefObject<((songId: string, position: number, queue: QueueSong[]) => void) | null>;
  queue: QueueSong[];
  currentIndex: number;
  repeat: RepeatMode;
  duration: number;
  resolveAndPlay: (song: QueueSong, index: number) => void;
};

export function useQueueNavigation({
  audioRef,
  queueRef,
  currentIndexRef,
  scheduleSyncRef,
  queue,
  currentIndex,
  repeat,
  duration,
  resolveAndPlay,
}: UseQueueNavigationParams) {
  const skipNext = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || queue.length === 0) return;

    let next = currentIndex + 1;
    if (next >= queue.length) {
      if (repeat === "repeat-all") {
        next = 0;
      } else {
        return;
      }
    }

    audio.pause();
    resolveAndPlay(queue[next], next);
  }, [audioRef, queue, currentIndex, repeat, resolveAndPlay]);

  const skipPrev = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || queue.length === 0) return;

    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    let prev = currentIndex - 1;
    if (prev < 0) {
      if (repeat === "repeat-all") {
        prev = queue.length - 1;
      } else {
        audio.currentTime = 0;
        return;
      }
    }

    audio.pause();
    resolveAndPlay(queue[prev], prev);
  }, [audioRef, queue, currentIndex, repeat, resolveAndPlay]);

  const seek = useCallback(
    (fraction: number) => {
      const audio = audioRef.current;
      if (!audio || duration <= 0) return;
      audio.currentTime = fraction * duration;
      const q = queueRef.current;
      const idx = currentIndexRef.current;
      const currentSong = idx >= 0 ? q[idx] : null;
      if (currentSong) {
        scheduleSyncRef.current?.(currentSong.id, fraction * duration, q);
      }
    },
    [audioRef, duration, queueRef, currentIndexRef, scheduleSyncRef],
  );

  return { skipNext, skipPrev, seek };
}
