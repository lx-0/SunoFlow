import { useState, useEffect, useRef } from "react";
import { hasFeedbackBeenSubmitted } from "../InAppFeedbackWidget";

interface TrackedSong {
  songId: string;
  status: string;
}

interface UseGenerationTrackingParams {
  trackedSongs: TrackedSong[];
  onGenerationComplete: (songId: string) => Promise<{ song?: { id: string; title: string | null } } | null | undefined>;
  trackSong: (songId: string, title: string | null) => void;
}

export function useGenerationTracking({
  trackedSongs,
  onGenerationComplete,
  trackSong,
}: UseGenerationTrackingParams) {
  const [showConfetti, setShowConfetti] = useState(false);
  const prevReadyCountRef = useRef(0);
  const processedCompletionsRef = useRef<Set<string>>(new Set());

  const [feedbackWidget, setFeedbackWidget] = useState<{ songId: string } | null>(null);
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
        // localStorage unavailable
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
