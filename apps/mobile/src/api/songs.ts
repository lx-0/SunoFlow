import { apiGet } from "./client";
import type { Song } from "@/types";

// Talks to the REAL backend library endpoint (GET /api/songs), which already
// authenticates the Bearer API key via resolveUser. Response shape:
// { songs, nextCursor, total }. Maps to the player's Song; songs without a
// playable audioUrl (still generating / failed) are dropped.

interface ApiSong {
  id: string;
  title: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
}
interface LibraryResponse {
  songs: ApiSong[];
  nextCursor: string | null;
  total: number;
}

export async function fetchLibrary(query?: string): Promise<Song[]> {
  const qs = query ? `?q=${encodeURIComponent(query)}` : "";
  const res = await apiGet<LibraryResponse>(`/api/songs${qs}`);
  return res.songs
    .filter((s): s is ApiSong & { audioUrl: string } => Boolean(s.audioUrl))
    .map((s) => ({
      id: s.id,
      title: s.title ?? "Untitled",
      streamUrl: s.audioUrl,
      artworkUrl: s.imageUrl ?? undefined,
      durationSeconds: s.duration ?? undefined,
    }));
}
