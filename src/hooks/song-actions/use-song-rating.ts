"use client";

import { useCallback, useEffect, useState } from "react";
import { getRating, type SongRating } from "@/lib/ratings";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { type ToastFn } from "@/components/Toast";
import { callApi, jsonPatch } from "./call-api";


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

  const [handleSaveRating, savingRating] = useAsyncAction(async () => {
    if (rating.stars === 0) return;
    const r: SongRating = { stars: rating.stars, note: noteDraft.trim() };
    const ok = await callApi(
      `/api/songs/${songId}/rating`,
      jsonPatch({ stars: r.stars, note: r.note }),
      toast,
      "Failed to save rating",
    );
    if (!ok) return;
    setRatingState(r);
    setSaved(true);
  });

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
