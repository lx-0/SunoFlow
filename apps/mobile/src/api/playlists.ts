import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// GET /api/playlists → { playlists: [{ id, name, _count: { songs } }] } (confirmed).
// Playlist detail / track shape is mapped DEFENSIVELY (unverified from headless).

export interface PlaylistSummary {
  id: string;
  name: string;
  songCount: number;
}

export async function fetchPlaylists(): Promise<PlaylistSummary[]> {
  const res = await apiGet<{ playlists: unknown[] }>("/api/playlists");
  const list = Array.isArray(res.playlists) ? res.playlists : [];
  return list.map((raw): PlaylistSummary | null => {
    if (!raw || typeof raw !== "object") return null;
    const p = raw as Record<string, unknown>;
    if (typeof p.id !== "string") return null;
    const count = (p._count as Record<string, unknown> | undefined)?.songs;
    return {
      id: p.id,
      name: typeof p.name === "string" ? p.name : "Untitled playlist",
      songCount: typeof count === "number" ? count : 0,
    };
  }).filter((p): p is PlaylistSummary => p !== null);
}

/** Fetch a playlist's playable tracks. Detail returns { playlist: { songs: [...] } }. */
export async function fetchPlaylistSongs(id: string): Promise<Song[]> {
  const res = await apiGet<{ playlist?: { songs?: unknown[] } }>(`/api/playlists/${id}`);
  const rawSongs = res.playlist?.songs;
  return (Array.isArray(rawSongs) ? rawSongs : []).map(mapApiSong).filter((s): s is Song => s !== null);
}
