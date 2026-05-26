"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import {
  type QueueContextValue,
  type QueueSong,
  type RadioParams,
  type RepeatMode,
} from "@/components/queue/queue-context-types";
import { buildPlayQueue } from "@/components/queue/queue-ops";
import { useMediaSession } from "@/components/queue/use-media-session";
import { usePlaybackModes } from "@/components/queue/use-playback-modes";
import { usePlaybackRecovery } from "@/components/queue/use-playback-recovery";
import { usePlaybackRestore } from "@/components/queue/use-playback-restore";
import { usePlaybackTracking } from "@/components/queue/use-playback-tracking";
import { usePlaybackSync } from "@/components/queue/use-playback-sync";
import { useQueueAudioEvents } from "@/components/queue/use-queue-audio-events";
import { useVolume } from "@/components/queue/use-volume";
import { useQueueActions } from "@/components/queue/use-queue-actions";
import { useRadio } from "@/components/queue/use-radio";

export type { QueueSong, RepeatMode, RadioParams } from "@/components/queue/queue-context-types";

// ─── Context ──────────────────────────────────────────────────────────────────

const QueueContext = createContext<QueueContextValue | null>(null);

export function useQueue(): QueueContextValue {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error("useQueue must be used within QueueProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function QueueProvider({ children }: { children: ReactNode }) {
  const { status: sessionStatus } = useSession();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const originalQueueRef = useRef<QueueSong[]>([]);
  const volumeRef = useRef(1);
  const scheduleSyncRef = useRef<((songId: string, position: number, queue: QueueSong[]) => void) | null>(null);

  const [queue, setQueue] = useState<QueueSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [playlistSource, setPlaylistSource] = useState<string | null>(null);
  const [shuffleVersions, setShuffleVersions] = useState(false);
  const [activeVersion, setActiveVersion] = useState<QueueSong | null>(null);
  const [restoredEQ, setRestoredEQ] = useState<{ gains: number[]; speed: number; pitch: number } | null>(null);
  const eqSettingsRef = useRef({ gains: [0, 0, 0, 0, 0], speed: 1, pitch: 0 });
  const { trackPlay, clearHistoryTimer } = usePlaybackTracking();

  const queueRef = useRef(queue);
  const currentIndexRef = useRef(currentIndex);
  const repeatRef = useRef(repeat);
  const shuffleRef = useRef(shuffle);
  const mutedRef = useRef(false);

  const cdnFallbackRef = useRef<Set<string>>(new Set());
  const versionCacheRef = useRef<Map<string, QueueSong[]>>(new Map());
  const shuffleVersionsRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCanPlayRef = useRef<(() => void) | null>(null);
  const skipNextRef = useRef<() => void>(() => {});
  const skipPrevRef = useRef<() => void>(() => {});
  const hasUserGestureRef = useRef(false);
  const retryPlayRef = useRef<(audio: HTMLAudioElement, retriesLeft?: number, delay?: number) => void>(() => {});
  const playQueueRef = useRef<(songs: QueueSong[], startIndex?: number, source?: string) => void>(() => {});

  const loadGenerationRef = useRef(0);
  const bumpLoadGeneration = useCallback(() => {
    loadGenerationRef.current += 1;
    return loadGenerationRef.current;
  }, []);

  const trackPlayRef = useRef(trackPlay);

  // ─── Volume ───────────────────────────────────────────────────────────────

  const {
    volume,
    muted,
    setVolume,
    toggleMute,
    setVolumeState,
    setMuted,
  } = useVolume({ audioRef });

  // ─── Sync refs ────────────────────────────────────────────────────────────

  queueRef.current = queue;
  currentIndexRef.current = currentIndex;
  repeatRef.current = repeat;
  shuffleRef.current = shuffle;
  trackPlayRef.current = trackPlay;
  shuffleVersionsRef.current = shuffleVersions;

  const {
    volume, muted, setVolume, toggleMute,
    volumeRef, mutedRef, setVolumeState, setMuted,
  } = useVolumeControl({ audioRef });

  const { scheduleSync, clearSyncTimer } = usePlaybackSync({
    volumeRef,
    shuffleVersionsRef,
    shuffleRef,
    repeatRef,
    mutedRef,
    eqSettingsRef,
  });

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
  }, []);
  retryPlayRef.current = retryPlay;

  scheduleSyncRef.current = scheduleSync;

  function getAudioSrc(song: QueueSong): string {
    if (cdnFallbackRef.current.has(song.id)) return song.audioUrl;
    return proxiedAudioUrl(song.id);
  }

  // ─── Playback core ────────────────────────────────────────────────────────

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
  }, [retryPlay, bumpLoadGeneration]);

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
  }, [retryPlay, bumpLoadGeneration]);

  resolveAndPlayRef.current = resolveAndPlay;

  // ─── Radio ────────────────────────────────────────────────────────────────

  const { radioStateRef, radioRefillRef, radioExcludedIds, setRadioState, ...radio } = useRadio({
    audioRef,
    queueRef,
    currentIndexRef,
    loadGenerationRef,
    playQueueRef,
    skipNextRef,
    startPlaybackForIndex,
    setQueue,
    setPlaylistSource,
  });

  // ─── Playback actions ─────────────────────────────────────────────────────

  const playQueue = useCallback(
    (songs: QueueSong[], startIndex = 0, source?: string) => {
      const audio = audioRef.current;
      if (!audio || songs.length === 0) return;

      setPlaylistSource(source ?? null);
      originalQueueRef.current = songs;

      const { playOrder, playIndex: playIdx } = buildPlayQueue(songs, startIndex, shuffle);

      setQueue(playOrder);
      startPlaybackForIndex(playOrder[playIdx], playIdx, {
        syncQueue: playOrder,
      });
    },
    [shuffle, startPlaybackForIndex]
  );
  playQueueRef.current = playQueue;

  const togglePlay = useCallback(
    (song?: QueueSong) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (!song) {
        if (isPlaying) {
          audio.pause();
        } else if (currentIndex >= 0 && queue.length > 0) {
          audio.play().catch(() => {});
        }
        return;
      }

      const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;
      if (currentSong && currentSong.id === song.id) {
        if (isPlaying) {
          audio.pause();
        } else {
          audio.play().catch(() => {});
        }
        return;
      }

      const idx = queue.findIndex((s) => s.id === song.id);
      if (idx >= 0) {
        startPlaybackForIndex(queue[idx], idx, {
          track: false,
          useRetryPlay: false,
        });
        return;
      }

      playQueue([song], 0);
    },
    [isPlaying, currentIndex, queue, playQueue, startPlaybackForIndex]
  );

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
  }, [queue, currentIndex, repeat, resolveAndPlay]);

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
  }, [queue, currentIndex, repeat, resolveAndPlay]);

  skipNextRef.current = skipNext;
  skipPrevRef.current = skipPrev;

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

  // ─── Queue management ─────────────────────────────────────────────────────

  const {
    playNext,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    toggleShuffle,
    toggleShuffleVersions,
    cycleRepeat,
  } = useQueueActions({
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
  });

  // ─── Audio events ─────────────────────────────────────────────────────────

  useQueueAudioEvents({
    audioRef,
    queueRef,
    currentIndexRef,
    repeatRef,
    radioStateRef,
    radioRefillRef,
    resolveAndPlayRef,
    retryPlay,
    scheduleSyncRef,
    cdnFallbackRef,
    loadGenerationRef,
    pendingCanPlayRef,
    retryTimerRef,
    pendingPlayRef,
    setIsPlaying,
    setIsBuffering,
    setCurrentTime,
    setDuration,
  });

  // ─── Side-effect hooks ────────────────────────────────────────────────────

  usePlaybackRecovery({
    audioRef,
    pendingPlayRef,
    hasUserGestureRef,
  });
  useMediaSession({
    isPlaying,
    queue,
    currentIndex,
    activeVersion,
    audioRef,
    skipNextRef,
    skipPrevRef,
  });

  usePlaybackRestore({
    sessionStatus,
    audioRef,
    loadGenerationRef,
    bumpLoadGeneration,
    originalQueueRef,
    setQueue,
    setCurrentIndex,
    setPlaylistSource,
    setDuration,
    setShuffleVersions,
    setShuffle,
    setRepeat,
    setMuted,
    setVolumeState,
    volumeRef,
    eqSettingsRef,
    setRestoredEQ,
  });

  // ─── Context value ────────────────────────────────────────────────────────

  const getAudioElement = useCallback(() => audioRef.current, []);

  const value: QueueContextValue = {
    queue,
    currentIndex,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    shuffle,
    repeat,
    volume,
    muted,
    playlistSource,
    radioState: radio.radioState,
    isRadioLoading: radio.isRadioLoading,
    shuffleVersions,
    activeVersion,
    playQueue,
    togglePlay,
    playNext,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    skipNext,
    skipPrev,
    seek,
    toggleShuffle,
    cycleRepeat,
    clearQueue,
    setVolume,
    toggleMute,
    getAudioElement,
    startRadio: radio.startRadio,
    stopRadio: radio.stopRadio,
    radioThumbsDown: radio.radioThumbsDown,
    toggleShuffleVersions,
    eqSettingsRef,
    restoredEQ,
  };

  return (
    <QueueContext.Provider value={value}>{children}</QueueContext.Provider>
  );
}
