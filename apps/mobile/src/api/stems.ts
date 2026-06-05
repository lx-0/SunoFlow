import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Stems are separately-generated child tracks of a song (child songs whose
// parentSongId === the song). Each stem is essentially a Song (has audioUrl),
// so we reuse the defensive mapApiSong mapper and drop anything unplayable.

interface StemsResponse {
  stems?: unknown[];
}

export async function fetchStems(songId: string): Promise<Song[]> {
  const res = await apiGet<StemsResponse>(`/api/songs/${songId}/stems`);
  if (!Array.isArray(res.stems)) return [];
  return res.stems.map(mapApiSong).filter((s): s is Song => s !== null);
}
