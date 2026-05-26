import { useEffect, useRef, useState } from "react";
import { hasFeedbackBeenSubmitted } from "@/components/InAppFeedbackWidget";

type TrackedSongStatus = "pending" | "ready" | "failed" | string;

type TrackedSong = {
  songId: string;
  status: TrackedSongStatus;
};

type CompletedSongResult = {
  song?: {
    id: string;
    title: string | null;
  } | null;
} | null;

type UseGenerationCompletionEffectsArgs = {
  trackedSongs: TrackedSong[];
  onGenerationComplete: (songId: string) => Promise<CompletedSongResult>;
  trackSong: (songId: string, songTitle: string | null) => void;
};

export function useGenerationCompletionEffects({
  trackedSongs,
  onGenerationComplete,
  trackSong,
}: UseGenerationCompletionEffectsArgs) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [feedbackWidget, setFeedbackWidget] = useState<{ songId: string } | null>(null);

  const prevReadyCountRef = useRef(0);
  const processedCompletionsRef = useRef<Set<string>>(new Set());
  const feedbackShownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const readyCount = trackedSongs.filter((s) => s.status === "ready").length;
    if (readyCount > prevReadyCountRef.current) {
      try {
        if (!localStorage.getItem("sunoflow-first-gen-celebrated")) {
          setShowConfetti(true);
          localStorage.setItem("sunoflow-first-gen-celebrated", "true");
        }
      } catch {
        // localStorage may be unavailable in some client contexts.
      }
    }
    prevReadyCountRef.current = readyCount;

    for (const song of trackedSongs) {
      if (
        (song.status === "ready" || song.status === "failed") &&
        !processedCompletionsRef.current.has(song.songId)
      ) {
        processedCompletionsRef.current.add(song.songId);
        onGenerationComplete(song.songId).then((result) => {
          if (result?.song) {
            trackSong(result.song.id, result.song.title);
          }
        });
      }

      if (
        song.status === "ready" &&
        !feedbackShownRef.current.has(song.songId) &&
        !hasFeedbackBeenSubmitted("song_generation", song.songId)
      ) {
        feedbackShownRef.current.add(song.songId);
        setFeedbackWidget({ songId: song.songId });
      }
    }
  }, [trackedSongs, onGenerationComplete, trackSong]);

  return {
    showConfetti,
    setShowConfetti,
    feedbackWidget,
    setFeedbackWidget,
  };
}
