import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Related songs ("also liked") for a given song. Backend returns
// { songs: BaseSongResult[], total } where each row carries audioUrl/imageUrl/
// title/duration/id — exactly what mapApiSong reads. Shape is mapped DEFENSIVELY
// (Array.isArray guard + null filter); unplayable rows degrade to skipped.

interface RelatedResponse {
  songs: unknown[];
  total: number;
}

export async function fetchRelated(songId: string): Promise<Song[]> {
  const res = await apiGet<RelatedResponse>(`/api/songs/${encodeURIComponent(songId)}/also-liked`);
  return (Array.isArray(res.songs) ? res.songs : [])
    .map(mapApiSong)
    .filter((s): s is Song => s !== null);
}
