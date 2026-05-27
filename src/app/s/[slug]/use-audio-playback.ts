"use client";

import { useCallback, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";

export function useAudioPlayback(initialDuration: number | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(initialDuration ?? 0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  const handleTogglePlay = useCallback(
    (activeSongId: string, resolvedAudioUrl: string | null) => {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        setAudioError(null);
        setIsBuffering(true);
        audioRef.current.play().catch((err) => {
          setIsBuffering(false);
          const msg = err instanceof Error ? err.message : "Playback failed";
          setAudioError(msg);
          Sentry.captureException(err, {
            tags: { component: "PublicSongView", songId: activeSongId },
            extra: { audioUrl: resolvedAudioUrl },
          });
        });
      }
    },
    [isPlaying]
  );

  const handleSeek = useCallback(
    (pct: number) => {
      if (!audioRef.current || audioDuration <= 0) return;
      audioRef.current.currentTime = pct * audioDuration;
    },
    [audioDuration]
  );

  function handleVolumeChange(value: number) {
    setVolume(value);
    setMuted(value === 0);
    if (audioRef.current) {
      audioRef.current.volume = value;
      audioRef.current.muted = value === 0;
    }
  }

  function handleToggleMute() {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
  }

  const resetPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setCurrentTime(0);
    setAudioError(null);
    setIsBuffering(false);
  }, []);

  const onPlay = useCallback(() => {
    setIsPlaying(true);
    setIsBuffering(false);
    setAudioError(null);
  }, []);

  const onPause = useCallback(() => setIsPlaying(false), []);

  const onEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const onTimeUpdate = useCallback(() => {
    setCurrentTime(audioRef.current?.currentTime ?? 0);
  }, []);

  const onDurationChange = useCallback(() => {
    setAudioDuration(audioRef.current?.duration ?? 0);
  }, []);

  const onWaiting = useCallback(() => setIsBuffering(true), []);
  const onCanPlay = useCallback(() => setIsBuffering(false), []);

  const onError = useCallback(
    (activeSongId: string, resolvedAudioUrl: string | null) => {
      setIsPlaying(false);
      setIsBuffering(false);
      const code = audioRef.current?.error?.code;
      const msg = code === 4 ? "Audio format not supported" : "Could not load audio";
      setAudioError(msg);
      Sentry.captureMessage(`Audio load error on public song`, {
        level: "error",
        tags: { component: "PublicSongView", songId: activeSongId, errorCode: String(code ?? "unknown") },
        extra: { audioUrl: resolvedAudioUrl },
      });
    },
    []
  );

  return {
    audioRef,
    isPlaying,
    currentTime,
    audioDuration,
    volume,
    muted,
    audioError,
    isBuffering,
    setAudioDuration,
    handleTogglePlay,
    handleSeek,
    handleVolumeChange,
    handleToggleMute,
    resetPlayback,
    onPlay,
    onPause,
    onEnded,
    onTimeUpdate,
    onDurationChange,
    onWaiting,
    onCanPlay,
    onError,
  };
}
