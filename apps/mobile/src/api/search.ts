import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Global search talks to the web endpoint `GET /api/search?q=` (authRoute →
// resolveUser accepts the bearer sk- key). `searchUserContent` returns the
// raw shape `{ songs: SongHit[], playlists: PlaylistHit[] }` directly
// (resultResponse serialises result.data — no envelope), scoped to the
// authenticated user's own library.
//
// IMPORTANT: a SongHit carries `{ id, title, imageUrl, ... }` but DELIBERATELY
// no `audioUrl` — it is NOT a playable row. To make tapped results play we
// join the hit ids against `GET /api/songs?q=` (library rows DO carry
// `audioUrl`, mapped by mapApiSong), preserving search order. Hits we can't
// resolve to a stream are still listed but degrade to a no-op on tap, they
// never throw. Everything is shape-guarded at the boundary.

interface SearchResponse {
  songs?: unknown;
  playlists?: unknown;
}

interface SongsResponse {
  songs?: unknown;
}

export interface PlaylistHit {
  id: string;
  name: string;
  songCount?: number;
}

export interface SearchResults {
  songs: Song[];
  playlists: PlaylistHit[];
}

/** Ordered, de-duplicated song-hit ids (drops malformed rows). */
function songHitIds(rows: unknown[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const id = (raw as Record<string, unknown>).id;
    if (typeof id !== "string" || !id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** Map a raw playlist hit defensively. Returns null if it lacks id+name. */
function mapPlaylistHit(raw: unknown): PlaylistHit | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const id = p.id;
  const name = p.name;
  if (typeof id !== "string" || !id) return null;
  if (typeof name !== "string" || !name) return null;
  // server projects `_count.songs`; tolerate either flattened or nested shape.
  const count = p._count;
  const songCount =
    count && typeof count === "object" && typeof (count as Record<string, unknown>).songs === "number"
      ? ((count as Record<string, unknown>).songs as number)
      : typeof p.songCount === "number"
        ? (p.songCount as number)
        : undefined;
  return { id, name, songCount };
}

/** Search the user's library. Empty query yields empty results. */
export async function search(q: string): Promise<SearchResults> {
  const term = q.trim();
  if (!term) return { songs: [], playlists: [] };

  const res = await apiGet<SearchResponse>(`/api/search?q=${encodeURIComponent(term)}`);

  const playlists = (Array.isArray(res?.playlists) ? res.playlists : [])
    .map(mapPlaylistHit)
    .filter((p): p is PlaylistHit => p !== null);

  const ids = songHitIds(Array.isArray(res?.songs) ? res.songs : []);
  if (ids.length === 0) return { songs: [], playlists };

  // Resolve playable streams from the user's library (audioUrl-bearing rows).
  const lib = await apiGet<SongsResponse>(`/api/songs?q=${encodeURIComponent(term)}`);
  const byId = new Map<string, Song>();
  for (const raw of Array.isArray(lib?.songs) ? lib.songs : []) {
    const song = mapApiSong(raw);
    if (song) byId.set(song.id, song);
  }

  // Preserve search order; drop hits we couldn't resolve to a stream.
  const songs = ids
    .map((id) => byId.get(id))
    .filter((s): s is Song => s !== undefined);

  return { songs, playlists };
}
