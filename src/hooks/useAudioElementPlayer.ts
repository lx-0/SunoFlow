"use client";

import { useCallback, useState } from "react";

interface UseAudioElementPlayerOptions {
  initialDuration?: number;
  initialVolume?: number;
}

export function useAudioElementPlayer(options: UseAudioElementPlayerOptions = {}) {
  const { initialDuration = 0, initialVolume = 1 } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [volume, setVolume] = useState(initialVolume);
  const [muted, setMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);

  const onPlay = useCallback(() => {
    setIsPlaying(true);
    setIsBuffering(false);
    setHasError(false);
  }, []);

  const onPause = useCallback(() => setIsPlaying(false), []);

  const onEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const onWaiting = useCallback(() => setIsBuffering(true), []);
  const onCanPlay = useCallback(() => setIsBuffering(false), []);

  const onError = useCallback(() => {
    setIsPlaying(false);
    setIsBuffering(false);
    setHasError(true);
  }, []);

  const syncCurrentTime = useCallback((audio: HTMLAudioElement | null) => {
    setCurrentTime(audio?.currentTime ?? 0);
  }, []);

  const syncDuration = useCallback((audio: HTMLAudioElement | null) => {
    setDuration(audio?.duration ?? 0);
  }, []);

  const seek = useCallback((audio: HTMLAudioElement | null, pct: number) => {
    if (!audio || duration <= 0) return;
    audio.currentTime = pct * duration;
  }, [duration]);

  const changeVolume = useCallback((audio: HTMLAudioElement | null, nextVolume: number) => {
    if (!audio) return;
    setVolume(nextVolume);
    audio.volume = nextVolume;
    if (nextVolume > 0) {
      setMuted(false);
      audio.muted = false;
    }
  }, []);

  const toggleMute = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) return;
    const nextMuted = !audio.muted;
    audio.muted = nextMuted;
    setMuted(nextMuted);
  }, []);

  const startLoad = useCallback(() => {
    setHasError(false);
    setIsBuffering(true);
  }, []);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return {
    state: {
      isPlaying,
      currentTime,
      duration,
      volume,
      muted,
      isBuffering,
      hasError,
      pct,
    },
    actions: {
      onPlay,
      onPause,
      onEnded,
      onWaiting,
      onCanPlay,
      onError,
      syncCurrentTime,
      syncDuration,
      seek,
      changeVolume,
      toggleMute,
      startLoad,
      setCurrentTime,
      setDuration,
      setIsPlaying,
      setHasError,
      setIsBuffering,
    },
  };
}
