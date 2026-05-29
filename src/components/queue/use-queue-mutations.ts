"use client";

import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { QueueSong } from "@/components/queue/queue-context-types";
import {
  insertAfterCurrent,
  removeFromQueueState,
  reorderQueueState,
} from "@/components/queue/queue-ops";

type UseQueueMutationsParams = {
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  currentIndexRef: MutableRefObject<number>;
  queueRef: MutableRefObject<QueueSong[]>;
  originalQueueRef: MutableRefObject<QueueSong[]>;
  setQueue: Dispatch<SetStateAction<QueueSong[]>>;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  setCurrentTime: Dispatch<SetStateAction<number>>;
  setDuration: Dispatch<SetStateAction<number>>;
};

export function useQueueMutations({
  audioRef,
  currentIndexRef,
  queueRef,
  originalQueueRef,
  setQueue,
  setCurrentIndex,
  setIsPlaying,
  setCurrentTime,
  setDuration,
}: UseQueueMutationsParams) {
  const playNext = useCallback((song: QueueSong) => {
    setQueue((prev) => insertAfterCurrent(prev, currentIndexRef.current, song));
    originalQueueRef.current = [...originalQueueRef.current, song];
  }, [setQueue, currentIndexRef, originalQueueRef]);

  const addToQueue = useCallback((song: QueueSong) => {
    setQueue((prev) => [...prev, song]);
    originalQueueRef.current = [...originalQueueRef.current, song];
  }, [setQueue, originalQueueRef]);

  const removeFromQueue = useCallback((index: number) => {
    const audio = audioRef.current;
    const result = removeFromQueueState(queueRef.current, currentIndexRef.current, index);
    setQueue(result.queue);
    setCurrentIndex(result.currentIndex);
    if (result.removedCurrent) {
      if (audio) { audio.pause(); audio.src = ""; }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [audioRef, queueRef, currentIndexRef, setQueue, setCurrentIndex, setIsPlaying, setCurrentTime, setDuration]);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    const result = reorderQueueState(queueRef.current, currentIndexRef.current, fromIndex, toIndex);
    setQueue(result.queue);
    setCurrentIndex(result.currentIndex);
  }, [queueRef, currentIndexRef, setQueue, setCurrentIndex]);

  return { playNext, addToQueue, removeFromQueue, reorderQueue };
}
