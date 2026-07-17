import { asRecord, asString, unwrapList } from "@sunoflow/core";
import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Following feed: songs surfaced by the people the user follows.
//
// `GET /api/feed` (authDataRoute, buildActivityFeed) returns
// `{ items: ActivityFeedItem[], pagination }`. Each item is an ACTIVITY, not a
// playable row: its nested `.song` carries `{ id, title, imageUrl, duration }`
// but DELIBERATELY no `audioUrl` (the web feed only links to `/s/<slug>`).
//
// To make the feed playable on mobile we join the feed's song ids against
// `GET /api/songs/public` (PublicSong rows DO carry `audioUrl`, plus the
// albumArtUrl/creatorDisplayName aliases mapApiSong reads), in `newest` order so
// recently-published followed songs resolve. Feed songs not present in that
// public sample degrade out (unplayable), they never throw.
//
// Everything is shape-guarded at the boundary: an unexpected envelope yields an
// empty list rather than a crash.

/** Ordered, de-duplicated song ids from feed items that reference a song. */
function feedSongIds(items: unknown[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const raw of items) {
    const id = asString(asRecord(asRecord(raw)?.song)?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** A playable feed song plus the activity context (who did what, when). */
export interface FeedEntry {
  song: Song;
  actor: string | null;
  verb: string;
  createdAt: string | null;
}

const VERBS: Record<string, string> = {
  song_created: "created",
  song_favorited: "favorited",
  song_added_to_playlist: "added to a playlist",
  song_removed_from_playlist: "removed from a playlist",
  playlist_created: "created a playlist",
};

/** First activity context per song id (actor name, verb, time). */
function feedContexts(items: unknown[]): Map<string, { actor: string | null; verb: string; createdAt: string | null }> {
  const ctx = new Map<string, { actor: string | null; verb: string; createdAt: string | null }>();
  for (const raw of items) {
    const item = asRecord(raw);
    if (!item) continue;
    const id = asString(asRecord(item.song)?.id);
    if (!id || ctx.has(id)) continue;
    const type = asString(item.type, "");
    ctx.set(id, {
      actor: asString(asRecord(item.user)?.name),
      verb: VERBS[type] ?? "shared",
      createdAt: asString(item.createdAt),
    });
  }
  return ctx;
}

/** Playable feed entries with activity context, in feed order. */
export async function fetchFeedEntries(): Promise<FeedEntry[]> {
  const feed = await apiGet<unknown>("/api/feed");
  const rawItems = asRecord(feed)?.items;
  const items = Array.isArray(rawItems) ? rawItems : [];
  const ids = feedSongIds(items);
  if (ids.length === 0) return [];
  const ctx = feedContexts(items);

  // Resolve playable URLs from the public catalog (audioUrl-bearing rows).
  const pub = await apiGet<unknown>("/api/songs/public?limit=100&sort=newest");
  const byId = new Map<string, Song>();
  for (const song of unwrapList(pub, "songs", mapApiSong)) {
    byId.set(song.id, song);
  }

  // Preserve feed order; drop feed songs we couldn't resolve to a stream.
  return ids
    .map((id) => {
      const song = byId.get(id);
      if (!song) return null;
      const c = ctx.get(id);
      return { song, actor: c?.actor ?? null, verb: c?.verb ?? "shared", createdAt: c?.createdAt ?? null };
    })
    .filter((e): e is FeedEntry => e !== null);
}

export async function fetchFeed(): Promise<Song[]> {
  return (await fetchFeedEntries()).map((e) => e.song);
}
