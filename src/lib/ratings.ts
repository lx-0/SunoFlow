/**
 * Song ratings — stored in localStorage for v1.
 * TODO: Move to backend persistence in v2 (POST /api/ratings).
 */

export interface SongRating {
  stars: number; // 1–5
  note: string;
}

const STORAGE_KEY = "sunoflow:ratings";

function loadRatings(): Record<string, SongRating> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SongRating>) : {};
  } catch {
    return {};
  }
}

export function getRatings(): Record<string, SongRating> {
  return loadRatings();
}

export function getRating(songId: string): SongRating | null {
  return loadRatings()[songId] ?? null;
}

export function setRating(songId: string, rating: SongRating): void {
  const ratings = loadRatings();
  ratings[songId] = rating;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
}

export function removeRating(songId: string): void {
  const ratings = loadRatings();
  delete ratings[songId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
}
