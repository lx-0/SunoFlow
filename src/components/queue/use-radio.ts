"use client";

import { useCallback, useRef, useState, type MutableRefObject } from "react";
import type { QueueSong, RadioParams } from "@/components/queue/queue-context-types";
import {
  buildRadioRequestUrl,
  removeFutureSongFromQueue,
} from "@/components/queue/radio-ops";

interface UseRadioParams {
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  queueRef: MutableRefObject<QueueSong[]>;
  currentIndexRef: MutableRefObject<number>;
  loadGenerationRef: MutableRefObject<number>;
  playQueueRef: MutableRefObject<(songs: QueueSong[], startIndex?: number, source?: string) => void>;
  skipNextRef: MutableRefObject<() => void>;
  startPlaybackForIndex: (song: QueueSong, index: number, options?: {
    track?: boolean;
    useRetryPlay?: boolean;
    syncQueue?: QueueSong[];
  }) => void;
  setQueue: React.Dispatch<React.SetStateAction<QueueSong[]>>;
  setPlaylistSource: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useRadio({
  audioRef,
  queueRef,
  currentIndexRef,
  loadGenerationRef,
  playQueueRef,
  skipNextRef,
  startPlaybackForIndex,
  setQueue,
  setPlaylistSource,
}: UseRadioParams) {
  const [radioState, setRadioState] = useState<RadioParams | null>(null);
  const [isRadioLoading, setIsRadioLoading] = useState(false);

  const radioStateRef = useRef<RadioParams | null>(null);
  const radioExcludedIds = useRef<Set<string>>(new Set());
  const radioRefillRef = useRef<(() => void) | null>(null);
  radioStateRef.current = radioState;

  const fetchRadioSongs = useCallback(
    async (params: RadioParams, excludeIds: string[]): Promise<QueueSong[]> => {
      const url = buildRadioRequestUrl(window.location.origin, params, excludeIds);
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.songs ?? []) as QueueSong[];
    },
    []
  );

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
        playQueueRef.current(songs, 0, params.mood ? `Radio: ${params.mood}` : "Radio");
      } finally {
        setIsRadioLoading(false);
      }
    },
    [fetchRadioSongs, playQueueRef]
  );

  const stopRadio = useCallback(() => {
    setRadioState(null);
    radioExcludedIds.current = new Set();
    setPlaylistSource(null);
  }, [setPlaylistSource]);

  const radioThumbsDown = useCallback((songId: string) => {
    radioExcludedIds.current.add(songId);
    setQueue((prev) => removeFutureSongFromQueue(prev, currentIndexRef.current, songId));
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    if (idx >= 0 && q[idx]?.id === songId) {
      skipNextRef.current();
    }
  }, [setQueue, currentIndexRef, queueRef, skipNextRef]);

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
  }, [fetchRadioSongs, startPlaybackForIndex, loadGenerationRef, audioRef, setQueue, currentIndexRef]);

  radioRefillRef.current = radioRefill;

  return {
    radioState,
    isRadioLoading,
    radioStateRef,
    radioExcludedIds,
    radioRefillRef,
    setRadioState,
    startRadio,
    stopRadio,
    radioThumbsDown,
  };
}
