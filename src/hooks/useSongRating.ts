"use client";

import { useEffect, useState } from "react";
import { getRating, type SongRating } from "@/lib/ratings";

type ThumbsRating = "thumbs_up" | "thumbs_down" | null;

interface UseSongRatingOptions {
  songId: string;
  initialRating: number | null;
  initialRatingNote: string | null;
  toast: (message: string, variant?: "success" | "error" | "info") => void;
}

export function useSongRating({
  songId,
  initialRating,
  initialRatingNote,
  toast,
}: UseSongRatingOptions) {
  const [rating, setRatingState] = useState<SongRating>({
    stars: initialRating ?? 0,
    note: initialRatingNote ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [noteDraft, setNoteDraft] = useState(initialRatingNote ?? "");

  const [thumbsRating, setThumbsRating] = useState<ThumbsRating>(null);
  const [savingThumbs, setSavingThumbs] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/songs/${songId}/feedback`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data?.rating) return;
        setThumbsRating(data.rating);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [songId]);

  async function handleThumbsFeedback(value: "thumbs_up" | "thumbs_down") {
    if (savingThumbs) return;
    setSavingThumbs(true);
    try {
      const res = await fetch(`/api/songs/${songId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });
      if (res.ok) setThumbsRating(value);
    } catch {
      toast("Failed to save feedback", "error");
    } finally {
      setSavingThumbs(false);
    }
  }

  function handleStarChange(stars: number) {
    setRatingState((r) => ({ ...r, stars }));
    setSaved(false);
  }

  async function handleSaveRating() {
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
  }

  return {
    rating,
    saved,
    noteDraft,
    setNoteDraft: (value: string) => { setNoteDraft(value); setSaved(false); },
    thumbsRating,
    savingThumbs,
    handleThumbsFeedback,
    handleStarChange,
    handleSaveRating,
  };
}
