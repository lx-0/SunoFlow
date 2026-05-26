"use client";

import { useCallback, useEffect, useState, type MutableRefObject } from "react";

interface UseVolumeParams {
  audioRef: MutableRefObject<HTMLAudioElement | null>;
}

export function useVolume({ audioRef }: UseVolumeParams) {
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted, audioRef]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (v > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  return {
    volume,
    muted,
    setVolume,
    toggleMute,
    setVolumeState,
    setMuted,
  };
}
