"use client";

import { useEffect, useState } from "react";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { type ToastFn } from "@/components/Toast";
import { callApi, jsonPost } from "./call-api";
import { fetchEffect } from "@/lib/fetch-effect";

type ThumbsRating = "thumbs_up" | "thumbs_down" | null;

interface UseSongFeedbackParams {
  songId: string;
  toast: ToastFn;
}

export function useSongFeedback({ songId, toast }: UseSongFeedbackParams) {
  const [thumbsRating, setThumbsRating] = useState<ThumbsRating>(null);

  useEffect(
    () =>
      fetchEffect<{ rating: ThumbsRating }>(
        `/api/songs/${songId}/feedback`,
        (data) => setThumbsRating(data.rating),
      ),
    [songId],
  );

  const [handleThumbsFeedback, savingThumbs] = useAsyncAction(async (value: "thumbs_up" | "thumbs_down") => {
    const ok = await callApi(`/api/songs/${songId}/feedback`, jsonPost({ rating: value }), toast, "Failed to save feedback");
    if (ok) setThumbsRating(value);
  });

  return { thumbsRating, savingThumbs, handleThumbsFeedback };
}
