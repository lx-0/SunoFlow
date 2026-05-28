"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function usePreviewPlayback() {
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingSongId(null);
  }, []);

  const handlePlayToggle = useCallback(
    (id: string, audioUrl: string | null) => {
      if (playingSongId === id) {
        audioRef.current?.pause();
        setPlayingSongId(null);
        return;
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (!audioUrl) return;
      const audio = new Audio(audioUrl);
      audio.volume = 0.7;
      audio.play().catch(() => {});
      audio.onended = () => setPlayingSongId(null);
      audioRef.current = audio;
      setPlayingSongId(id);
    },
    [playingSongId],
  );

  return { playingSongId, handlePlayToggle, stopPlayback };
}
