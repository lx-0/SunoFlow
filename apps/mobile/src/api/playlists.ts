import { asNumber, asRecord, asString, unwrapList } from "@sunoflow/core";
import { apiGet, apiPost } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

/** Add a song to a playlist. POST /api/playlists/[id]/songs { songId }. */
export async function addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
  await apiPost(`/api/playlists/${playlistId}/songs`, { songId });
}

// GET /api/playlists → { playlists: [{ id, name, _count: { songs } }] } (confirmed).
// Playlist detail / track shape is mapped DEFENSIVELY (unverified from headless).

export interface PlaylistSummary {
  id: string;
  name: string;
  songCount: number;
}

/** Defensive map of one raw playlist row → PlaylistSummary (shared with smart-playlists). */
export function mapPlaylistSummary(raw: unknown): PlaylistSummary | null {
  const p = asRecord(raw);
  const id = p ? asString(p.id) : null;
  if (!p || !id) return null;
  return {
    id,
    name: asString(p.name) ?? "Untitled playlist",
    songCount: asNumber(asRecord(p._count)?.songs, 0),
  };
}

export async function fetchPlaylists(): Promise<PlaylistSummary[]> {
  const res = await apiGet<unknown>("/api/playlists");
  return unwrapList(res, "playlists", mapPlaylistSummary);
}

/** Fetch a playlist's playable tracks. Detail returns { playlist: { songs: [...] } }. */
export async function fetchPlaylistSongs(id: string): Promise<Song[]> {
  const res = await apiGet<{ playlist?: unknown }>(`/api/playlists/${id}`);
  return unwrapList(res?.playlist, "songs", mapApiSong);
}
