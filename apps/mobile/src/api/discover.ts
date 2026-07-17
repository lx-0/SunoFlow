import { unwrapList } from "@sunoflow/core";
import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Public discover feed. The web route `/api/discover` (optionalAuth — our bearer
// key resolves to a user, so we get the personalized branch) returns
// `{ feed: FeedItem[], pagination, strategy }`. FeedItem is a FLAT song row
// (audioUrl/imageUrl/duration/title/id + creator metadata) — no `.song` nesting.
//
// The shared `mapApiSong` supplies the playability guard AND reads the
// creatorDisplayName alias for the artist. Everything is shape-guarded: an
// unexpected envelope degrades to an empty list, never throws.
//
// `mood` + `page` are forwarded as query params (`/api/discover?mood=…&page=…`).
// The server folds `mood` into the discoverable tag filter (see src/lib/feed).

// Mood keyword list mirrors MOOD_KEYWORDS in src/lib/songs/taxonomy.ts (the same
// taxonomy the radio/discover moods use). Lowercase = the value sent to the API.
export const DISCOVER_MOODS: string[] = [
  "energetic",
  "chill",
  "dark",
  "uplifting",
  "melancholic",
  "aggressive",
  "relaxed",
  "happy",
  "sad",
  "epic",
  "dreamy",
  "intense",
  "romantic",
  "mysterious",
  "peaceful",
  "angry",
  "nostalgic",
  "euphoric",
  "somber",
  "atmospheric",
  "hypnotic",
  "groovy",
  "emotional",
  "powerful",
  "calm",
];

export interface DiscoverOptions {
  mood?: string;
  page?: number;
}

function buildQuery(opts?: DiscoverOptions): string {
  const params = new URLSearchParams();
  if (opts?.mood) params.set("mood", opts.mood);
  if (opts?.page && opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchDiscover(opts?: DiscoverOptions): Promise<Song[]> {
  const res = await apiGet<unknown>(`/api/discover${buildQuery(opts)}`);
  return unwrapList(res, "feed", mapApiSong);
}
