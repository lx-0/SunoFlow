"use client";

import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { proxiedAudioUrl } from "@/lib/audio-cdn";
import type { QueueSong } from "@/components/queue/queue-context-types";

type UseAudioPlaybackParams = {
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  shuffleVersionsRef: MutableRefObject<boolean>;
  trackPlayRef: MutableRefObject<(songId: string) => void>;
  scheduleSyncRef: MutableRefObject<((songId: string, position: number, queue: QueueSong[]) => void) | null>;
  setCurrentIndex: Dispatch<SetStateAction<number>>;
  setCurrentTime: Dispatch<SetStateAction<number>>;
  setDuration: Dispatch<SetStateAction<number>>;
  setActiveVersion: Dispatch<SetStateAction<QueueSong | null>>;
};

export function useAudioPlayback({
  audioRef,
  shuffleVersionsRef,
  trackPlayRef,
  scheduleSyncRef,
  setCurrentIndex,
  setCurrentTime,
  setDuration,
  setActiveVersion,
}: UseAudioPlaybackParams) {
  const cdnFallbackRef = useRef<Set<string>>(new Set());
  const versionCacheRef = useRef<Map<string, QueueSong[]>>(new Map());
  const pendingPlayRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCanPlayRef = useRef<(() => void) | null>(null);
  const hasUserGestureRef = useRef(false);
  const retryPlayRef = useRef<(audio: HTMLAudioElement, retriesLeft?: number, delay?: number) => void>(() => {});

  // Monotonic counter incremented on every transition that changes the
  // currently-loaded audio source. Async paths capture the generation at
  // dispatch time and abort if it no longer matches — prevents stale
  // fetches from clobbering audio.src after the user has moved on.
  const loadGenerationRef = useRef(0);
  const bumpLoadGeneration = useCallback(() => {
    loadGenerationRef.current += 1;
    return loadGenerationRef.current;
  }, []);

  function getAudioSrc(song: QueueSong): string {
    if (cdnFallbackRef.current.has(song.id)) return song.audioUrl;
    return proxiedAudioUrl(song.id);
  }

  const retryPlay = useCallback((audio: HTMLAudioElement, retriesLeft = 3, delay = 300) => {
    if (audioRef.current !== audio) return;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (!hasUserGestureRef.current) {
      pendingPlayRef.current = true;
      return;
    }
    audio.play()
      .then(() => { pendingPlayRef.current = false; })
      .catch((err: DOMException) => {
        if (err.name === "NotAllowedError") {
          pendingPlayRef.current = true;
          return;
        }
        if (err.name === "AbortError" && retriesLeft > 0) {
          retryTimerRef.current = setTimeout(() => {
            retryPlayRef.current(audio, retriesLeft - 1, delay * 2);
          }, delay);
          return;
        }
        pendingPlayRef.current = true;
      });
  }, [audioRef]);
  retryPlayRef.current = retryPlay;

  const startPlaybackForIndex = useCallback((song: QueueSong, index: number, options?: {
    track?: boolean;
    useRetryPlay?: boolean;
    syncQueue?: QueueSong[];
  }) => {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentIndex(index);
    setCurrentTime(0);
    setDuration(song.duration ?? 0);
    audio.pause();
    bumpLoadGeneration();
    cdnFallbackRef.current.delete(song.id);
    audio.src = getAudioSrc(song);
    if (options?.useRetryPlay === false) {
      audio.play().catch(() => {});
    } else {
      retryPlay(audio);
    }

    if (options?.track !== false) {
      trackPlayRef.current(song.id);
    }

    if (options?.syncQueue) {
      scheduleSyncRef.current?.(song.id, 0, options.syncQueue);
    }
  }, [audioRef, retryPlay, bumpLoadGeneration, setCurrentIndex, setCurrentTime, setDuration, trackPlayRef, scheduleSyncRef]);

  const resolveAndPlayRef = useRef<((song: QueueSong, index: number) => Promise<void>) | null>(null);

  const resolveAndPlay = useCallback(async (song: QueueSong, index: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const generation = bumpLoadGeneration();
    cdnFallbackRef.current.delete(song.id);

    setCurrentIndex(index);
    setCurrentTime(0);
    setDuration(song.duration ?? 0);

    if (pendingCanPlayRef.current) {
      audio.removeEventListener("canplay", pendingCanPlayRef.current);
      pendingCanPlayRef.current = null;
    }

    const loadAndPlay = (target: QueueSong) => {
      if (loadGenerationRef.current !== generation) return;

      audio.autoplay = true;
      audio.src = getAudioSrc(target);

      const onCanPlayOnce = () => {
        audio.removeEventListener("canplay", onCanPlayOnce);
        pendingCanPlayRef.current = null;
        if (loadGenerationRef.current !== generation) return;
        if (audio.paused) {
          audio.play()
            .then(() => { pendingPlayRef.current = false; })
            .catch(() => { pendingPlayRef.current = true; });
        }
      };
      pendingCanPlayRef.current = onCanPlayOnce;
      audio.addEventListener("canplay", onCanPlayOnce);

      retryPlay(audio);
    };

    if (!shuffleVersionsRef.current) {
      setActiveVersion(null);
      loadAndPlay(song);
      trackPlayRef.current(song.id);
      return;
    }

    let versions = versionCacheRef.current.get(song.id);
    if (!versions) {
      try {
        const res = await fetch(`/api/songs/${song.id}/playable-versions`);
        if (res.ok) {
          const data = await res.json();
          versions = (data.versions ?? []) as QueueSong[];
          versionCacheRef.current.set(song.id, versions);
        }
      } catch {
        // Fall through to play canonical
      }
    }

    if (loadGenerationRef.current !== generation) return;

    if (versions && versions.length > 1) {
      const picked = versions[Math.floor(Math.random() * versions.length)];
      setActiveVersion(picked);
      loadAndPlay(picked);
      trackPlayRef.current(picked.id);
    } else {
      setActiveVersion(null);
      loadAndPlay(song);
      trackPlayRef.current(song.id);
    }
  }, [audioRef, retryPlay, bumpLoadGeneration, setCurrentIndex, setCurrentTime, setDuration, setActiveVersion, shuffleVersionsRef, trackPlayRef]);

  resolveAndPlayRef.current = resolveAndPlay;

  return {
    retryPlay,
    startPlaybackForIndex,
    resolveAndPlay,
    resolveAndPlayRef,
    bumpLoadGeneration,
    loadGenerationRef,
    cdnFallbackRef,
    versionCacheRef,
    pendingPlayRef,
    retryTimerRef,
    pendingCanPlayRef,
    hasUserGestureRef,
  };
}
