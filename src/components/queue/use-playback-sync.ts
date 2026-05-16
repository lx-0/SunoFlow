"use client";

import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { savePlaybackState } from "@/components/queue/playback-state";
import type { QueueSong, RepeatMode } from "@/components/queue/queue-context-types";

const SYNC_DEBOUNCE_MS = 12_000;

type EQSettings = { gains: number[]; speed: number; pitch: number };

type SyncRefs = {
  volumeRef: MutableRefObject<number>;
  shuffleVersionsRef: MutableRefObject<boolean>;
  shuffleRef: MutableRefObject<boolean>;
  repeatRef: MutableRefObject<RepeatMode>;
  mutedRef: MutableRefObject<boolean>;
  eqSettingsRef: MutableRefObject<EQSettings>;
};

export function usePlaybackSync({
  volumeRef,
  shuffleVersionsRef,
  shuffleRef,
  repeatRef,
  mutedRef,
  eqSettingsRef,
}: SyncRefs) {
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSync = useCallback(
    (songId: string, position: number, queue: QueueSong[]) => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        const eq = eqSettingsRef.current;
        savePlaybackState({
          songId,
          position,
          queue,
          volume: volumeRef.current,
          shuffleVersions: shuffleVersionsRef.current,
          shuffle: shuffleRef.current,
          repeat: repeatRef.current,
          muted: mutedRef.current,
          eqSettings: { gains: eq.gains, speed: eq.speed, pitch: eq.pitch },
        });
      }, SYNC_DEBOUNCE_MS);
    },
    [eqSettingsRef, mutedRef, repeatRef, shuffleRef, shuffleVersionsRef, volumeRef]
  );

  const clearSyncTimer = useCallback(() => {
    if (!syncTimerRef.current) return;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = null;
  }, []);

  useEffect(() => () => clearSyncTimer(), [clearSyncTimer]);

  return {
    scheduleSync,
    clearSyncTimer,
  };
}
