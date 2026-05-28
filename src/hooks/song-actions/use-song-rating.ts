"use client";

import { useCallback, useEffect, useState } from "react";
import { getRating, type SongRating } from "@/lib/ratings";

type ToastFn = (message: string, type?: "success" | "error" | "info") => void;

interface UseSongRatingParams {
  songId: string;
  initialRating: number | null;
  initialRatingNote: string | null;
  toast: ToastFn;
}

export function useSongRating({
  songId,
  initialRating,
  initialRatingNote,
  toast,
}: UseSongRatingParams) {
  const [rating, setRatingState] = useState<SongRating>({
    stars: initialRating ?? 0,
    note: initialRatingNote ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [noteDraft, setNoteDraft] = useState(initialRatingNote ?? "");

  useEffect(() => {
    if (initialRating) return;
    let cancelled = false;
    getRating(songId).then((existing) => {
      if (cancelled || !existing) return;
      setRatingState(existing);
      setNoteDraft(existing.note);
    });
    return () => { cancelled = true; };
  }, [songId, initialRating]);

  const handleStarChange = useCallback((stars: number) => {
    setRatingState((r) => ({ ...r, stars }));
    setSaved(false);
  }, []);

  const handleSaveRating = useCallback(async () => {
    if (rating.stars === 0 || savingRating) return;
    const r: SongRating = { stars: rating.stars, note: noteDraft.trim() };
    setSavingRating(true);
    try {
      const res = await fetch(`/api/songs/${songId}/rating`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars: r.stars, note: r.note }),
      });
      if (!res.ok) throw new Error("Failed to save rating");
      setRatingState(r);
      setSaved(true);
    } catch {
      toast("Failed to save rating", "error");
    } finally {
      setSavingRating(false);
    }
  }, [rating.stars, savingRating, noteDraft, songId, toast]);

  return {
    rating,
    saved,
    savingRating,
    noteDraft,
    setNoteDraft,
    setSaved,
    handleStarChange,
    handleSaveRating,
  };
}
