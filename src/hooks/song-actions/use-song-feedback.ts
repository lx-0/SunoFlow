"use client";

import { useCallback, useEffect, useState } from "react";

type ToastFn = (message: string, type?: "success" | "error" | "info") => void;
type ThumbsRating = "thumbs_up" | "thumbs_down" | null;

interface UseSongFeedbackParams {
  songId: string;
  toast: ToastFn;
}

export function useSongFeedback({ songId, toast }: UseSongFeedbackParams) {
  const [thumbsRating, setThumbsRating] = useState<ThumbsRating>(null);
  const [savingThumbs, setSavingThumbs] = useState(false);

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

  const handleThumbsFeedback = useCallback(async (value: "thumbs_up" | "thumbs_down") => {
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
  }, [savingThumbs, songId, toast]);

  return { thumbsRating, savingThumbs, handleThumbsFeedback };
}
