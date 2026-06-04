import { apiGet, apiPatch } from "@/api/client";

// Per-song, per-user star rating (1-5; 0 clears it).
// Web contract: GET/PATCH /api/songs/[id]/rating return the unwrapped row
// { rating: number|null, ratingNote: string|null }; PATCH body is { stars }.

type RatingResponse = { rating?: unknown; ratingNote?: unknown };

// Coerce the upstream rating into an integer 0-5, or null when absent/invalid.
function normalizeRating(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

export async function getRating(songId: string): Promise<number | null> {
  const res = await apiGet<RatingResponse>(
    `/api/songs/${encodeURIComponent(songId)}/rating`,
  );
  return normalizeRating(res?.rating);
}

export async function setRating(songId: string, value: number): Promise<void> {
  await apiPatch<RatingResponse>(
    `/api/songs/${encodeURIComponent(songId)}/rating`,
    { stars: value },
  );
}
