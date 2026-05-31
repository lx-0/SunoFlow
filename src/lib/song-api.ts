/**
 * Thin wrappers around the three song mutation endpoints shared by
 * useLibrarySongActions and components/library/hooks.
 */

import { fetchWithTimeout } from "./fetch-client";

export type RefreshResult =
  | { deleted: true }
  | { audioUrl: string | null };

export type FavoriteResult = { favoriteCount: number };

export type RetryResult =
  | { song: Record<string, unknown> }
  | { rateLimitMinutes: number }
  | { error: string };

export async function refreshSongAudio(songId: string): Promise<RefreshResult> {
  const res = await fetchWithTimeout(`/api/songs/${songId}/refresh`, { method: "POST" });
  if (res.status === 404) {
    const data = await res.json().catch(() => ({})) as { code?: string };
    if (data.code === "SONG_DELETED") return { deleted: true };
  }
  if (!res.ok) throw new Error("refresh failed");
  const data = await res.json() as { song?: { audioUrl?: string } };
  return { audioUrl: data.song?.audioUrl ?? null };
}

export async function toggleSongFavorite(
  songId: string,
  newFav: boolean,
): Promise<FavoriteResult> {
  const res = await fetchWithTimeout(`/api/songs/${songId}/favorite`, {
    method: newFav ? "POST" : "DELETE",
  });
  if (!res.ok) throw new Error("favorite toggle failed");
  return (await res.json()) as FavoriteResult;
}

export async function retrySong(songId: string): Promise<RetryResult> {
  const res = await fetchWithTimeout(`/api/songs/${songId}/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json() as {
    song?: Record<string, unknown>;
    resetAt?: string;
    error?: string;
  };
  if (!res.ok) {
    if (res.status === 429 && data.resetAt) {
      const minutesLeft = Math.ceil(
        (new Date(data.resetAt).getTime() - Date.now()) / 60000,
      );
      return { rateLimitMinutes: minutesLeft };
    }
    return { error: data.error ?? "Retry failed. Please try again." };
  }
  return { song: data.song ?? {} };
}
