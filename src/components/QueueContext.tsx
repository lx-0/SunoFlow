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
import { proxiedAudioUrl } from "@/lib/audio-cdn";
import {
  type QueueContextValue,
  type QueueSong,
  type RadioParams,
  type RepeatMode,
} from "@/components/queue/queue-context-types";
import {
  buildPlayQueue,
  insertAfterCurrent,
  removeFromQueueState,
  reorderQueueState,
  toggleShuffleQueue,
} from "@/components/queue/queue-ops";
import { useMediaSession } from "@/components/queue/use-media-session";
import { usePlaybackRecovery } from "@/components/queue/use-playback-recovery";
import { usePlaybackRestore } from "@/components/queue/use-playback-restore";
import { usePlaybackTracking } from "@/components/queue/use-playback-tracking";
import { usePlaybackSync } from "@/components/queue/use-playback-sync";
import { useQueueAudioEvents } from "@/components/queue/use-queue-audio-events";
import { useRadioActions } from "@/components/queue/use-radio-actions";
import { useVolumeControl } from "@/components/queue/use-volume-control";

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

  // Original (unshuffled) queue preserved for unshuffle
  const originalQueueRef = useRef<QueueSong[]>([]);

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

  // Shared refs for radio (used by useQueueAudioEvents and useRadioActions)
  const radioStateRef = useRef<RadioParams | null>(null);
  const radioRefillRef = useRef<(() => void) | null>(null);

  // Refs for event handlers (avoid stale closures)
  const queueRef = useRef(queue);
  const currentIndexRef = useRef(currentIndex);
  const repeatRef = useRef(repeat);
  const shuffleRef = useRef(shuffle);

  // Tracks songs that failed through the CDN proxy and fell back to direct URL
  const cdnFallbackRef = useRef<Set<string>>(new Set());

  // Version cache — keyed by queue song ID, stores playable versions for the session
  const versionCacheRef = useRef<Map<string, QueueSong[]>>(new Map());
  const shuffleVersionsRef = useRef(false);
  /** True when audio.play() was rejected (e.g. backgrounded on mobile) */
  const pendingPlayRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Pending canplay handler for mobile source-loading fallback */
  const pendingCanPlayRef = useRef<(() => void) | null>(null);
  const skipNextRef = useRef<() => void>(() => {});
  const skipPrevRef = useRef<() => void>(() => {});
  const hasUserGestureRef = useRef(false);
  const retryPlayRef = useRef<(audio: HTMLAudioElement, retriesLeft?: number, delay?: number) => void>(() => {});

  // Monotonic counter incremented on every transition that changes the
  // currently-loaded audio source. Async paths (CDN-error refresh,
  // playable-versions fetch, deferred canplay handlers) capture the
  // generation at dispatch time and abort if it no longer matches —
  // prevents stale fetches from clobbering audio.src after the user has
  // already moved to a different song.
  const loadGenerationRef = useRef(0);
  const bumpLoadGeneration = useCallback(() => {
    loadGenerationRef.current += 1;
    return loadGenerationRef.current;
  }, []);

  const trackPlayRef = useRef(trackPlay);
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

  // Retry audio.play() with exponential backoff — only for transient play()
  // rejections (AbortError when a new load interrupts play). Source/network
  // errors are handled by the <audio> "error" event, not here.
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

  /**
   * Returns the audio src for a song, using the CDN proxy by default.
   * Falls back to the direct Suno URL after a proxy error.
   */
  function getAudioSrc(song: QueueSong): string {
    if (cdnFallbackRef.current.has(song.id)) return song.audioUrl;
    return proxiedAudioUrl(song.id);
  }

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

  // Ref for resolveAndPlay — used inside the audio onEnded handler
  const resolveAndPlayRef = useRef<((song: QueueSong, index: number) => Promise<void>) | null>(null);

  /**
   * Advance to a song, optionally picking a random version when shuffleVersions is on.
   * Uses a per-session cache to avoid repeated version fetches.
   */
  const resolveAndPlay = useCallback(async (song: QueueSong, index: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const generation = bumpLoadGeneration();

    // Drop the per-song CDN-fallback flag for the song we're about to play.
    // Otherwise a single transient proxy error pins the song to direct-CDN
    // for the rest of the session, even after the proxy recovers (and we
    // also lose the local file-cache hit on subsequent replays).
    cdnFallbackRef.current.delete(song.id);

    setCurrentIndex(index);
    setCurrentTime(0);
    setDuration(song.duration ?? 0);

    // Remove any prior canplay fallback from a previous transition
    if (pendingCanPlayRef.current) {
      audio.removeEventListener("canplay", pendingCanPlayRef.current);
      pendingCanPlayRef.current = null;
    }

    const loadAndPlay = (target: QueueSong) => {
      // Bail if a newer transition has started since this load was scheduled.
      if (loadGenerationRef.current !== generation) return;

      // Installed PWAs are allowed to autoplay. Setting this before changing
      // src lets the browser auto-start the next track without a play() call,
      // which avoids NotAllowedError on mobile during song transitions.
      audio.autoplay = true;
      audio.src = getAudioSrc(target);

      // Fallback: when the source is ready, try play() directly (bypassing
      // retryPlay's guards) in case autoplay didn't kick in.
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

      // Fast path for cached sources (service worker hit)
      retryPlay(audio);
    };

    if (!shuffleVersionsRef.current) {
      setActiveVersion(null);
      loadAndPlay(song);
      trackPlayRef.current(song.id);
      return;
    }

    // Check cache first, then fetch
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

    // The fetch may have raced with a newer transition — abort if so.
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

  // ─── Actions ──────────────────────────────────────────────────────────────

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

  const togglePlay = useCallback(
    (song?: QueueSong) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (!song) {
        // Simple toggle
        if (isPlaying) {
          audio.pause();
        } else if (currentIndex >= 0 && queue.length > 0) {
          audio.play().catch(() => {});
        }
        return;
      }

      // Check if this song is already the current one
      const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;
      if (currentSong && currentSong.id === song.id) {
        if (isPlaying) {
          audio.pause();
        } else {
          audio.play().catch(() => {});
        }
        return;
      }

      // Song is in the queue but not current — jump to it
      const idx = queue.findIndex((s) => s.id === song.id);
      if (idx >= 0) {
        startPlaybackForIndex(queue[idx], idx, {
          track: false,
          useRetryPlay: false,
        });
        return;
      }

      // Not in queue — play as solo
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
        return; // End of queue
      }
    }

    audio.pause();
    resolveAndPlay(queue[next], next);
  }, [queue, currentIndex, repeat, resolveAndPlay]);

  const skipPrev = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || queue.length === 0) return;

    // If more than 3 seconds in, restart current song
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
    [duration]
  );

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
  }, []);

  const toggleShuffleVersions = useCallback(() => {
    setShuffleVersions((prev) => {
      const next = !prev;
      if (!next) setActiveVersion(null);
      return next;
    });
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => {
      if (prev === "off") return "repeat-all";
      if (prev === "repeat-all") return "repeat-one";
      return "off";
    });
  }, []);

  const playNext = useCallback((song: QueueSong) => {
    setQueue((prev) => insertAfterCurrent(prev, currentIndexRef.current, song));
    originalQueueRef.current = [...originalQueueRef.current, song];
  }, []);

  const addToQueue = useCallback((song: QueueSong) => {
    setQueue((prev) => [...prev, song]);
    originalQueueRef.current = [...originalQueueRef.current, song];
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    const audio = audioRef.current;
    const result = removeFromQueueState(queueRef.current, currentIndexRef.current, index);
    setQueue(result.queue);
    setCurrentIndex(result.currentIndex);
    if (result.removedCurrent) {
      // Removing the currently-playing song — stop playback
      if (audio) { audio.pause(); audio.src = ""; }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    const result = reorderQueueState(queueRef.current, currentIndexRef.current, fromIndex, toIndex);
    setQueue(result.queue);
    setCurrentIndex(result.currentIndex);
  }, []);

  // ─── Radio actions ─────────────────────────────────────────────────────────

  const {
    radioState, isRadioLoading,
    startRadio, stopRadio, radioThumbsDown, clearRadio,
  } = useRadioActions({
    audioRef, queueRef, currentIndexRef, loadGenerationRef,
    radioStateRef, radioRefillRef,
    playQueue, skipNext, startPlaybackForIndex,
    setQueue, setPlaylistSource,
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
    clearRadio();
    originalQueueRef.current = [];
    setActiveVersion(null);
    versionCacheRef.current = new Map();
  }, [clearHistoryTimer, clearSyncTimer, clearRadio]);

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

  // ─── Current song helper ──────────────────────────────────────────────────

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
    radioState,
    isRadioLoading,
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
    startRadio,
    stopRadio,
    radioThumbsDown,
    toggleShuffleVersions,
    eqSettingsRef,
    restoredEQ,
  };

  return (
    <QueueContext.Provider value={value}>{children}</QueueContext.Provider>
  );
}
