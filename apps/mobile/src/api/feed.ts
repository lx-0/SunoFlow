import { apiGet } from "./client";
import type { Song } from "@/types";

// Following feed: songs surfaced by the people the user follows.
//
// `GET /api/feed` (authDataRoute, buildActivityFeed) returns
// `{ items: ActivityFeedItem[], pagination }`. Each item is an ACTIVITY, not a
// playable row: its nested `.song` carries `{ id, title, imageUrl, duration }`
// but DELIBERATELY no `audioUrl` (the web feed only links to `/s/<slug>`).
//
// To make the feed playable on mobile we join the feed's song ids against
// `GET /api/songs/public` (PublicSong rows DO carry `audioUrl`), in `newest`
// order so recently-published followed songs resolve. Feed songs not present in
// that public sample degrade out (unplayable), they never throw.
//
// Everything is shape-guarded at the boundary: an unexpected envelope yields an
// empty list rather than a crash.

interface FeedResponse {
  items?: unknown;
}

interface PublicSongsResponse {
  songs?: unknown;
}

/** Ordered, de-duplicated song ids from feed items that reference a song. */
function feedSongIds(items: unknown[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const song = item.song;
    if (!song || typeof song !== "object") continue;
    const id = (song as Record<string, unknown>).id;
    if (typeof id !== "string" || !id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** Map a PublicSong row to a playable Song. Returns null if not playable. */
function mapPublicSong(raw: unknown): Song | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const id = s.id;
  const audioUrl = s.audioUrl;
  if (typeof id !== "string" || !id) return null;
  if (typeof audioUrl !== "string" || !audioUrl) return null;
  const artist = typeof s.creatorDisplayName === "string" && s.creatorDisplayName
    ? s.creatorDisplayName
    : undefined;
  return {
    id,
    title: typeof s.title === "string" && s.title ? s.title : "Untitled",
    artist,
    streamUrl: audioUrl,
    artworkUrl: typeof s.albumArtUrl === "string" ? s.albumArtUrl : undefined,
    durationSeconds: typeof s.duration === "number" ? s.duration : undefined,
  };
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
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const song = item.song;
    if (!song || typeof song !== "object") continue;
    const id = (song as Record<string, unknown>).id;
    if (typeof id !== "string" || !id || ctx.has(id)) continue;
    const user = item.user && typeof item.user === "object" ? (item.user as Record<string, unknown>) : null;
    const type = typeof item.type === "string" ? item.type : "";
    ctx.set(id, {
      actor: user && typeof user.name === "string" ? user.name : null,
      verb: VERBS[type] ?? "shared",
      createdAt: typeof item.createdAt === "string" ? item.createdAt : null,
    });
  }
  return ctx;
}

/** Playable feed entries with activity context, in feed order. */
export async function fetchFeedEntries(): Promise<FeedEntry[]> {
  const feed = await apiGet<FeedResponse>("/api/feed");
  const items = Array.isArray(feed?.items) ? feed.items : [];
  const ids = feedSongIds(items);
  if (ids.length === 0) return [];
  const ctx = feedContexts(items);

  // Resolve playable URLs from the public catalog (audioUrl-bearing rows).
  const pub = await apiGet<PublicSongsResponse>("/api/songs/public?limit=100&sort=newest");
  const rows = Array.isArray(pub?.songs) ? pub.songs : [];
  const byId = new Map<string, Song>();
  for (const raw of rows) {
    const song = mapPublicSong(raw);
    if (song) byId.set(song.id, song);
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
