import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Public discover feed. The web route `/api/discover` (optionalAuth — our bearer
// key resolves to a user, so we get the personalized branch) returns
// `{ feed: FeedItem[], pagination, strategy }`. FeedItem is a FLAT song row
// (audioUrl/imageUrl/duration/title/id + creator metadata) — no `.song` nesting.
//
// We map with the shared `mapApiSong` for the playability guard, then enrich the
// artist from `creatorDisplayName` (which mapApiSong doesn't read). Everything is
// shape-guarded: an unexpected envelope degrades to an empty list, never throws.

interface DiscoverResponse {
  feed?: unknown;
}

function readArtist(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const name = r.creatorDisplayName;
  return typeof name === "string" && name ? name : undefined;
}

export async function fetchDiscover(): Promise<Song[]> {
  const res = await apiGet<DiscoverResponse>("/api/discover");
  const rows = Array.isArray(res?.feed) ? res.feed : [];
  return rows
    .map((raw) => {
      const song = mapApiSong(raw);
      if (!song) return null;
      const artist = readArtist(raw);
      return artist ? { ...song, artist } : song;
    })
    .filter((s): s is Song => s !== null);
}
