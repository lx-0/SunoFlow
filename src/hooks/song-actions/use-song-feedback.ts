"use client";

import { useEffect, useState } from "react";
import { useAsyncAction } from "@/hooks/useAsyncAction";

type ToastFn = (message: string, type?: "success" | "error" | "info") => void;
type ThumbsRating = "thumbs_up" | "thumbs_down" | null;

interface UseSongFeedbackParams {
  songId: string;
  toast: ToastFn;
}

export function useSongFeedback({ songId, toast }: UseSongFeedbackParams) {
  const [thumbsRating, setThumbsRating] = useState<ThumbsRating>(null);

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

  const [handleThumbsFeedback, savingThumbs] = useAsyncAction(async (value: "thumbs_up" | "thumbs_down") => {
    const res = await fetch(`/api/songs/${songId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: value }),
    });
    if (res.ok) setThumbsRating(value);
    else toast("Failed to save feedback", "error");
  });

  return { thumbsRating, savingThumbs, handleThumbsFeedback };
}
