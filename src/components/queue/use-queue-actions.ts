"use client";

import { useCallback, type MutableRefObject } from "react";
import type { QueueSong, RepeatMode } from "@/components/queue/queue-context-types";
import {
  insertAfterCurrent,
  removeFromQueueState,
  reorderQueueState,
  toggleShuffleQueue,
} from "@/components/queue/queue-ops";

interface UseQueueActionsParams {
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  queueRef: MutableRefObject<QueueSong[]>;
  currentIndexRef: MutableRefObject<number>;
  originalQueueRef: MutableRefObject<QueueSong[]>;
  setQueue: React.Dispatch<React.SetStateAction<QueueSong[]>>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  setShuffle: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  setDuration: React.Dispatch<React.SetStateAction<number>>;
  setActiveVersion: React.Dispatch<React.SetStateAction<QueueSong | null>>;
  setShuffleVersions: React.Dispatch<React.SetStateAction<boolean>>;
  setRepeat: React.Dispatch<React.SetStateAction<RepeatMode>>;
  setPlaylistSource: React.Dispatch<React.SetStateAction<string | null>>;
  clearHistoryTimer: () => void;
  clearSyncTimer: () => void;
  setRadioState: React.Dispatch<React.SetStateAction<import("@/components/queue/queue-context-types").RadioParams | null>>;
  radioExcludedIds: MutableRefObject<Set<string>>;
  versionCacheRef: MutableRefObject<Map<string, QueueSong[]>>;
}

export function useQueueActions({
  audioRef,
  queueRef,
  currentIndexRef,
  originalQueueRef,
  setQueue,
  setCurrentIndex,
  setShuffle,
  setIsPlaying,
  setCurrentTime,
  setDuration,
  setActiveVersion,
  setShuffleVersions,
  setRepeat,
  setPlaylistSource,
  clearHistoryTimer,
  clearSyncTimer,
  setRadioState,
  radioExcludedIds,
  versionCacheRef,
}: UseQueueActionsParams) {
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

  const clearQueue = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    clearHistoryTimer();
    clearSyncTimer();
    setQueue([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaylistSource(null);
    setRadioState(null);
    radioExcludedIds.current = new Set();
    originalQueueRef.current = [];
    setActiveVersion(null);
    versionCacheRef.current = new Map();
  }, [audioRef, clearHistoryTimer, clearSyncTimer, setQueue, setCurrentIndex, setIsPlaying, setCurrentTime, setDuration, setPlaylistSource, setRadioState, radioExcludedIds, originalQueueRef, setActiveVersion, versionCacheRef]);

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

  return {
    playNext,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    toggleShuffle,
    toggleShuffleVersions,
    cycleRepeat,
  };
}
