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

export async function fetchLibrary(query?: string): Promise<Song[]> {
  const qs = query ? `?q=${encodeURIComponent(query)}` : "";
  const res = await apiGet<LibraryResponse>(`/api/songs${qs}`);
  return (Array.isArray(res.songs) ? res.songs : []).map(mapApiSong).filter((s): s is Song => s !== null);
}
