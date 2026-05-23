import { useEffect, useRef, type MutableRefObject } from "react";

import type { QueueSong, RepeatMode } from "@/components/queue/queue-context-types";
import { loadPlaybackState } from "@/components/queue/playback-state";

type EqSettings = { gains: number[]; speed: number; pitch: number };

type UsePlaybackRestoreParams = {
  sessionStatus: string;
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  loadGenerationRef: MutableRefObject<number>;
  bumpLoadGeneration: () => number;
  originalQueueRef: MutableRefObject<QueueSong[]>;
  setQueue: (queue: QueueSong[]) => void;
  setCurrentIndex: (index: number) => void;
  setPlaylistSource: (source: string | null) => void;
  setDuration: (duration: number) => void;
  setShuffleVersions: (enabled: boolean) => void;
  setShuffle: (enabled: boolean) => void;
  setRepeat: (repeat: RepeatMode) => void;
  setMuted: (muted: boolean) => void;
  setVolumeState: (volume: number) => void;
  volumeRef: MutableRefObject<number>;
  eqSettingsRef: MutableRefObject<EqSettings>;
  setRestoredEQ: (eq: EqSettings) => void;
};

export function usePlaybackRestore({
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
}: UsePlaybackRestoreParams) {
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    loadPlaybackState()
      .then((restored) => {
        if (!restored) return;
        const audio = audioRef.current;
        if (!audio) return;

        // If the user interacted before the restore resolved, abandon — we
        // must not clobber their newly-chosen playback.
        if (loadGenerationRef.current !== 0) return;

        // Load the queue state without auto-playing
        originalQueueRef.current = restored.queue;
        setQueue(restored.queue);
        setCurrentIndex(restored.currentIndex);
        setPlaylistSource("Resume");
        setDuration(restored.duration);

        // Set the audio source but don't play
        audio.autoplay = false;
        const restoreGeneration = bumpLoadGeneration();
        audio.src = restored.initialSrc;

        if (restored.shuffleVersions) setShuffleVersions(true);
        if (restored.shuffle) setShuffle(true);

        setRepeat(restored.repeat);
        if (restored.muted) setMuted(true);

        // Restore volume
        setVolumeState(restored.volume);
        volumeRef.current = restored.volume;
        audio.volume = restored.volume;

        // Restore EQ settings for AudioEQContext to pick up
        if (restored.eqSettings) {
          eqSettingsRef.current = restored.eqSettings;
          setRestoredEQ(restored.eqSettings);
        }

        // Seek to saved position after audio loads
        if (restored.position > 0 && restored.duration > 0) {
          const handleCanPlay = () => {
            audio.removeEventListener("canplay", handleCanPlay);
            // Don't seek into a different song the user picked while we waited.
            if (loadGenerationRef.current !== restoreGeneration) return;
            audio.currentTime = restored.position;
          };
          audio.addEventListener("canplay", handleCanPlay);
        }
      })
      .catch(() => {});
  }, [
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
  ]);
}
