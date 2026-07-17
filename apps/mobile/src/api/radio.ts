import { unwrapList } from "@sunoflow/core";
import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Radio: a generated continuous station. GET /api/radio (authRoute → resolveUser
// accepts the bearer sk- key) curates user + public songs into a shuffled queue.
// Response shape confirmed from src/lib/radio: { songs: [{ id, title, audioUrl,
// imageUrl, duration, lyrics }], mood, genre, total }. Song rows carry audioUrl/
// imageUrl/duration, exactly what mapApiSong reads; map DEFENSIVELY and drop any
// unplayable row (missing audioUrl) rather than throwing.
//
// The GET accepts optional query params (mood, genre, tempoMin, tempoMax, limit);
// mood + genre are matched against tags, lowercased server-side. We forward the
// user's mood/genre selection so the native Radio screen can curate a station.

// Mood keywords mirror the web Mood Radio (src/components/MoodRadioView.tsx) and
// are a subset of MOOD_KEYWORDS in src/lib/radio. Plain lowercase keywords; the
// server lowercases + tag-matches anyway.
export const RADIO_MOODS: string[] = [
  "energetic",
  "chill",
  "dark",
  "uplifting",
  "melancholic",
  "experimental",
  "dreamy",
  "epic",
  "relaxed",
  "happy",
  "mysterious",
  "romantic",
];

// Genre options mirror the web Mood Radio genre dropdown.
export const RADIO_GENRES: string[] = [
  "Pop",
  "Rock",
  "Electronic",
  "Jazz",
  "Classical",
  "Hip Hop",
  "Folk",
  "Ambient",
  "Metal",
];

/** Fetch the radio station's upcoming songs, optionally filtered by mood/genre. */
export async function fetchRadio(opts?: { mood?: string; genre?: string }): Promise<Song[]> {
  const params = new URLSearchParams();
  const mood = opts?.mood?.trim();
  const genre = opts?.genre?.trim();
  if (mood) params.set("mood", mood);
  if (genre) params.set("genre", genre);
  const qs = params.toString();

  const res = await apiGet<unknown>(`/api/radio${qs ? `?${qs}` : ""}`);
  return unwrapList(res, "songs", mapApiSong);
}
