import { unwrapList } from "@sunoflow/core";
import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Related songs ("also liked") for a given song. Backend returns
// { songs: BaseSongResult[], total } where each row carries audioUrl/imageUrl/
// title/duration/id — exactly what mapApiSong reads. Shape is mapped DEFENSIVELY
// (unwrapList envelope guard); unplayable rows degrade to skipped.

export async function fetchRelated(songId: string): Promise<Song[]> {
  const res = await apiGet<unknown>(`/api/songs/${encodeURIComponent(songId)}/also-liked`);
  return unwrapList(res, "songs", mapApiSong);
}
