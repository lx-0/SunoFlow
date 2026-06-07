import { apiGet, apiPost } from "@/api/client";

// Thumbs up / down generation-quality feedback — mirrors the web SongRatingPanel's
// thumbs control. Separate from the 1–5 star rating (RatingStars).
//   GET  /api/songs/[id]/feedback        -> { rating: "thumbs_up" | "thumbs_down" | null }
//   POST /api/songs/[id]/feedback { rating }

export type ThumbsRating = "thumbs_up" | "thumbs_down";

/** Current thumbs feedback for a song, or null if none set. */
export async function fetchFeedback(songId: string): Promise<ThumbsRating | null> {
  const r = await apiGet<{ rating?: string | null }>(
    `/api/songs/${encodeURIComponent(songId)}/feedback`,
  );
  return r?.rating === "thumbs_up" || r?.rating === "thumbs_down" ? r.rating : null;
}

/** Set thumbs feedback (toggling is handled by the caller). */
export async function setFeedback(songId: string, rating: ThumbsRating): Promise<void> {
  await apiPost(`/api/songs/${encodeURIComponent(songId)}/feedback`, { rating });
}
