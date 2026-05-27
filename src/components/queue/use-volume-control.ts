"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

type UseVolumeControlParams = {
  audioRef: MutableRefObject<HTMLAudioElement | null>;
};

export function useVolumeControl({ audioRef }: UseVolumeControlParams) {
  const volumeRef = useRef(1);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  volumeRef.current = volume;
  mutedRef.current = muted;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted, audioRef]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (v > 0 && muted) setMuted(false);
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  return {
    volume,
    muted,
    setVolume,
    toggleMute,
    volumeRef,
    mutedRef,
    setVolumeState,
    setMuted,
  };
}
