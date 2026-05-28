"use client";

import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { QueueSong, RepeatMode } from "@/components/queue/queue-context-types";
import { toggleShuffleQueue } from "@/components/queue/queue-ops";

type UsePlaybackModesParams = {
  queueRef: MutableRefObject<QueueSong[]>;
  currentIndexRef: MutableRefObject<number>;
  originalQueueRef: MutableRefObject<QueueSong[]>;
  setShuffle: Dispatch<SetStateAction<boolean>>;
  setShuffleVersions: Dispatch<SetStateAction<boolean>>;
  setActiveVersion: Dispatch<SetStateAction<QueueSong | null>>;
  setRepeat: Dispatch<SetStateAction<RepeatMode>>;
  setQueue: Dispatch<SetStateAction<QueueSong[]>>;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
};

export function usePlaybackModes({
  queueRef,
  currentIndexRef,
  originalQueueRef,
  setShuffle,
  setShuffleVersions,
  setActiveVersion,
  setRepeat,
  setQueue,
  setCurrentIndex,
}: UsePlaybackModesParams) {
  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => {
      const next = !prev;
      const result = toggleShuffleQueue(
        queueRef.current,
        currentIndexRef.current,
        next,
        originalQueueRef.current,
      );
      setQueue(result.queue);
      setCurrentIndex(result.currentIndex);
      return next;
    });
  }, [queueRef, currentIndexRef, originalQueueRef, setShuffle, setQueue, setCurrentIndex]);

  const toggleShuffleVersions = useCallback(() => {
    setShuffleVersions((prev) => {
      const next = !prev;
      if (!next) setActiveVersion(null);
      return next;
    });
  }, [setShuffleVersions, setActiveVersion]);

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => {
      if (prev === "off") return "repeat-all";
      if (prev === "repeat-all") return "repeat-one";
      return "off";
    });
  }, [setRepeat]);

  return { toggleShuffle, toggleShuffleVersions, cycleRepeat };
}
