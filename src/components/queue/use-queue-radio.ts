"use client";

import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { buildRadioRequestUrl, removeFutureSongFromQueue } from "@/components/queue/radio-ops";
import type { QueueSong, RadioParams } from "@/components/queue/queue-context-types";
import { apiGet } from "@/lib/api-client";

type UseQueueRadioParams = {
  loadGenerationRef: MutableRefObject<number>;
  radioStateRef: MutableRefObject<RadioParams | null>;
  currentIndexRef: MutableRefObject<number>;
  queueRef: MutableRefObject<QueueSong[]>;
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  setQueue: Dispatch<SetStateAction<QueueSong[]>>;
  setRadioState: Dispatch<SetStateAction<RadioParams | null>>;
  setPlaylistSource: Dispatch<SetStateAction<string | null>>;
  setIsRadioLoading: Dispatch<SetStateAction<boolean>>;
  playQueue: (songs: QueueSong[], startIndex?: number, source?: string) => void;
  startPlaybackForIndex: (song: QueueSong, index: number, options?: {
    track?: boolean;
    useRetryPlay?: boolean;
    syncQueue?: QueueSong[];
  }) => void;
  skipNext: () => void;
};

export function useQueueRadio({
  loadGenerationRef,
  radioStateRef,
  currentIndexRef,
  queueRef,
  audioRef,
  setQueue,
  setRadioState,
  setPlaylistSource,
  setIsRadioLoading,
  playQueue,
  startPlaybackForIndex,
  skipNext,
}: UseQueueRadioParams) {
  const radioExcludedIds = useRef<Set<string>>(new Set());

  const fetchRadioSongs = useCallback(
    async (params: RadioParams, excludeIds: string[]): Promise<QueueSong[]> => {
      const url = buildRadioRequestUrl(window.location.origin, params, excludeIds);
      try {
        const data = await apiGet<{ songs?: QueueSong[] }>(url);
        return data.songs ?? [];
      } catch {
        return [];
      }
    },
    []
  );

  const resetRadioState = useCallback(() => {
    setRadioState(null);
    radioExcludedIds.current = new Set();
  }, [setRadioState]);

  const startRadio = useCallback(
    async (params: RadioParams) => {
      setIsRadioLoading(true);
      radioExcludedIds.current = new Set();
      try {
        const songs = await fetchRadioSongs(params, []);
        if (songs.length === 0) {
          setIsRadioLoading(false);
          return;
        }
        setRadioState(params);
        songs.forEach((s) => radioExcludedIds.current.add(s.id));
        playQueue(songs, 0, params.mood ? `Radio: ${params.mood}` : "Radio");
      } finally {
        setIsRadioLoading(false);
      }
    },
    [fetchRadioSongs, playQueue, setIsRadioLoading, setRadioState]
  );

  const stopRadio = useCallback(() => {
    resetRadioState();
    setPlaylistSource(null);
  }, [resetRadioState, setPlaylistSource]);

  const radioThumbsDown = useCallback((songId: string) => {
    radioExcludedIds.current.add(songId);
    setQueue((prev) => removeFutureSongFromQueue(prev, currentIndexRef.current, songId));
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    if (idx >= 0 && q[idx]?.id === songId) {
      skipNext();
    }
  }, [currentIndexRef, queueRef, setQueue, skipNext]);

  const radioRefill = useCallback(() => {
    const params = radioStateRef.current;
    if (!params) return;
    const excludeIds = Array.from(radioExcludedIds.current);
    const generation = loadGenerationRef.current;
    fetchRadioSongs(params, excludeIds).then((songs) => {
      if (songs.length === 0) return;
      if (loadGenerationRef.current !== generation) return;
      songs.forEach((s) => radioExcludedIds.current.add(s.id));
      const audio = audioRef.current;
      setQueue((prev) => {
        const merged = [...prev, ...songs];
        if (currentIndexRef.current < 0 && merged.length > 0 && audio) {
          const firstNew = prev.length;
          startPlaybackForIndex(merged[firstNew], firstNew);
        }
        return merged;
      });
    });
  }, [
    audioRef,
    currentIndexRef,
    fetchRadioSongs,
    loadGenerationRef,
    radioStateRef,
    setQueue,
    startPlaybackForIndex,
  ]);

  return {
    startRadio,
    stopRadio,
    radioThumbsDown,
    radioRefill,
    resetRadioState,
  };
}
