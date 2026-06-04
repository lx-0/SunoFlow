import { apiGet } from "./client";
import type { Song } from "@/types";

// Talks to the REAL backend (bearer-authed via resolveUser). Response shapes are
// confirmed for /api/songs ({ songs, nextCursor, total }); playlist track shape
// is mapped DEFENSIVELY (shape-guards at the data boundary) since it's unverified
// from this headless env — wrong/missing fields degrade to "skipped", never crash.

interface LibraryResponse {
  songs: unknown[];
  nextCursor: string | null;
  total: number;
}

/** Defensive map of one raw API song → player Song. Returns null if unplayable. */
export function mapApiSong(raw: unknown): Song | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  // playlist entries may nest the song under `.song`
  const src = (s.song && typeof s.song === "object" ? (s.song as Record<string, unknown>) : s);
  const audioUrl = src.audioUrl;
  if (typeof audioUrl !== "string" || !audioUrl) return null;
  return {
    id: String(src.id ?? audioUrl),
    title: typeof src.title === "string" ? src.title : "Untitled",
    streamUrl: audioUrl,
    artworkUrl: typeof src.imageUrl === "string" ? src.imageUrl : undefined,
    durationSeconds: typeof src.duration === "number" ? src.duration : undefined,
  };
}

export interface SongPage {
  songs: Song[];
  nextCursor: string | null;
}

/**
 * One page of the library. `nextCursor` (from the server's raw result) drives
 * infinite scroll; it's correct even though we drop unplayable rows client-side,
 * because the server computes it before our filter.
 */
export async function fetchSongsPage(opts: { query?: string; cursor?: string | null } = {}): Promise<SongPage> {
  const params = new URLSearchParams();
  if (opts.query) params.set("q", opts.query);
  if (opts.cursor) params.set("cursor", opts.cursor);
  const qs = params.toString();
  const res = await apiGet<LibraryResponse>(`/api/songs${qs ? `?${qs}` : ""}`);
  const songs = (Array.isArray(res.songs) ? res.songs : [])
    .map(mapApiSong)
    .filter((s): s is Song => s !== null);
  return { songs, nextCursor: res.nextCursor ?? null };
}

/** Back-compat: first page only, songs array. */
export async function fetchLibrary(query?: string): Promise<Song[]> {
  return (await fetchSongsPage({ query })).songs;
}
