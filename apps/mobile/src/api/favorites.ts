import { apiGet, apiPost, apiDelete } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Favorites talk to the existing web endpoints (authRoute → resolveUser accepts
// the bearer sk- key). GET /favorite returns { isFavorite }, POST adds, DELETE
// removes; GET /songs/favorites lists the favorited songs (newest-liked first).

interface FavoritesResponse {
  songs: unknown[];
  nextCursor: string | null;
  total: number;
}

/** List the user's favorited songs. */
export async function fetchFavorites(): Promise<Song[]> {
  const res = await apiGet<FavoritesResponse>(`/api/songs/favorites`);
  return (Array.isArray(res.songs) ? res.songs : [])
    .map(mapApiSong)
    .filter((s): s is Song => s !== null);
}

export async function getFavorite(songId: string): Promise<boolean> {
  const res = await apiGet<{ isFavorite?: boolean }>(`/api/songs/${songId}/favorite`);
  return Boolean(res?.isFavorite);
}

export async function setFavorite(songId: string, favorite: boolean): Promise<void> {
  if (favorite) {
    await apiPost(`/api/songs/${songId}/favorite`, {});
  } else {
    await apiDelete(`/api/songs/${songId}/favorite`);
  }
}
