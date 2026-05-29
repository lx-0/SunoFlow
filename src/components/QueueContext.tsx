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
import {
  buildPlayQueue,
  insertAfterCurrent,
  removeFromQueueState,
  reorderQueueState,
  toggleShuffleQueue,
} from "@/components/queue/queue-ops";
import { useAudioPlayback } from "@/components/queue/use-audio-playback";
import { useMediaSession } from "@/components/queue/use-media-session";
import { usePlaybackModes } from "@/components/queue/use-playback-modes";
import { usePlaybackRecovery } from "@/components/queue/use-playback-recovery";
import { usePlaybackRestore } from "@/components/queue/use-playback-restore";
import { usePlaybackTracking } from "@/components/queue/use-playback-tracking";
import { usePlaybackSync } from "@/components/queue/use-playback-sync";
import { useQueueAudioEvents } from "@/components/queue/use-queue-audio-events";
import { useQueueMutations } from "@/components/queue/use-queue-mutations";
import { useQueueNavigation } from "@/components/queue/use-queue-navigation";
import { useQueueRadio } from "@/components/queue/use-queue-radio";
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
  const [radioState, setRadioState] = useState<RadioParams | null>(null);
  const [isRadioLoading, setIsRadioLoading] = useState(false);
  const eqSettingsRef = useRef({ gains: [0, 0, 0, 0, 0], speed: 1, pitch: 0 });
  const { trackPlay, clearHistoryTimer } = usePlaybackTracking();

  // Shared refs for radio (used by useQueueAudioEvents and useQueueRadio)
  const radioStateRef = useRef<RadioParams | null>(null);
  radioStateRef.current = radioState;

  // Ref to the radio refill function — set after actions are defined
  const radioRefillRef = useRef<(() => void) | null>(null);

  // Refs for event handlers (avoid stale closures)
  const queueRef = useRef(queue);
  const currentIndexRef = useRef(currentIndex);
  const repeatRef = useRef(repeat);
  const shuffleRef = useRef(shuffle);

  const shuffleVersionsRef = useRef(false);
  const skipNextRef = useRef<() => void>(() => {});
  const skipPrevRef = useRef<() => void>(() => {});

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

  scheduleSyncRef.current = scheduleSync;

  const {
    retryPlay, startPlaybackForIndex, resolveAndPlay, resolveAndPlayRef,
    bumpLoadGeneration, loadGenerationRef,
    cdnFallbackRef, versionCacheRef,
    pendingPlayRef, retryTimerRef, pendingCanPlayRef, hasUserGestureRef,
  } = useAudioPlayback({
    audioRef,
    shuffleVersionsRef,
    trackPlayRef,
    scheduleSyncRef,
    setCurrentIndex,
    setCurrentTime,
    setDuration,
    setActiveVersion,
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

  const { skipNext, skipPrev, seek } = useQueueNavigation({
    audioRef,
    queueRef,
    currentIndexRef,
    scheduleSyncRef,
    queue,
    currentIndex,
    repeat,
    duration,
    resolveAndPlay,
  });

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
    originalQueueRef.current = [];
    setActiveVersion(null);
    versionCacheRef.current = new Map();
  }, [clearHistoryTimer, clearSyncTimer, versionCacheRef]);

  const {
    startRadio,
    stopRadio,
    radioThumbsDown,
    radioRefill,
  } = useQueueRadio({
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
  });

  radioRefillRef.current = radioRefill;

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
