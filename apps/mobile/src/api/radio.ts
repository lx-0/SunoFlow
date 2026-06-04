import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Radio: a generated continuous station. GET /api/radio (authRoute → resolveUser
// accepts the bearer sk- key) curates user + public songs into a shuffled queue.
// Response shape confirmed from src/lib/radio: { songs: [{ id, title, audioUrl,
// imageUrl, duration, lyrics }], mood, genre, total }. Song rows carry audioUrl/
// imageUrl/duration, exactly what mapApiSong reads; map DEFENSIVELY and drop any
// unplayable row (missing audioUrl) rather than throwing.

interface RadioResponse {
  songs: unknown[];
  mood: string | null;
  genre: string | null;
  total: number;
}

/** Fetch the radio station's upcoming songs. */
export async function fetchRadio(): Promise<Song[]> {
  const res = await apiGet<RadioResponse>(`/api/radio`);
  return (Array.isArray(res?.songs) ? res.songs : [])
    .map(mapApiSong)
    .filter((s): s is Song => s !== null);
}
