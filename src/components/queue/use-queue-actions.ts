"use client";

import { useCallback, type MutableRefObject } from "react";
import type { QueueSong, RepeatMode } from "@/components/queue/queue-context-types";
import { useQueueMutations } from "@/components/queue/use-queue-mutations";
import { usePlaybackModes } from "@/components/queue/use-playback-modes";

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
  const { playNext, addToQueue, removeFromQueue, reorderQueue } = useQueueMutations({
    audioRef,
    currentIndexRef,
    queueRef,
    originalQueueRef,
    setQueue,
    setCurrentIndex,
    setIsPlaying,
    setCurrentTime,
    setDuration,
  });

  const { toggleShuffle, toggleShuffleVersions, cycleRepeat } = usePlaybackModes({
    queueRef,
    currentIndexRef,
    originalQueueRef,
    setShuffle,
    setShuffleVersions,
    setActiveVersion,
    setRepeat,
    setQueue,
    setCurrentIndex,
  });

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
