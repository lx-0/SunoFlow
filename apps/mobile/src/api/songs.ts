import { asBool, asNumber, asRecord, asString, unwrapList } from "@sunoflow/core";
import { apiGet } from "./client";
import type { Song } from "@/types";

// Talks to the REAL backend (bearer-authed via resolveUser). Response shapes are
// confirmed for /api/songs ({ songs, nextCursor, total }); playlist track shape
// is mapped DEFENSIVELY (shape-guards at the data boundary) since it's unverified
// from this headless env — wrong/missing fields degrade to "skipped", never crash.

interface LibraryResponse {
  songs: unknown[];
  nextCursor: string | null;
  total: number;
}

/**
 * Defensive map of one raw API song → player Song. Returns null if unplayable.
 * The ONE song mapper for every endpoint variant: library rows (imageUrl),
 * public/discover rows (albumArtUrl + creatorDisplayName aliases), and playlist
 * entries (nested under `.song`).
 */
export function mapApiSong(raw: unknown): Song | null {
  const s = asRecord(raw);
  if (!s) return null;
  // playlist entries may nest the song under `.song`
  const src = asRecord(s.song) ?? s;
  const audioUrl = asString(src.audioUrl);
  if (!audioUrl) return null;
  return {
    id: String(src.id ?? audioUrl),
    title: asString(src.title) ?? "Untitled",
    artist: asString(src.creatorDisplayName) ?? undefined,
    streamUrl: audioUrl,
    artworkUrl: asString(src.imageUrl) ?? asString(src.albumArtUrl) ?? undefined,
    videoUrl: asString(src.videoUrl),
    durationSeconds: asNumber(src.duration) ?? undefined,
    isFavorite: asBool(src.isFavorite),
    rating: asNumber(src.rating),
  };
}

export interface SongPage {
  songs: Song[];
  nextCursor: string | null;
}

/**
 * One page of the library. `nextCursor` (from the server's raw result) drives
 * infinite scroll; it's correct even though we drop unplayable rows client-side,
 * because the server computes it before our filter.
 */
export type SongSortBy =
  | "newest"
  | "oldest"
  | "highest_rated"
  | "most_played"
  | "recently_modified"
  | "title_az";

/**
 * Generation-status filter. Mirrors the server's `status` query param, which is
 * only honored for these exact values (mapped to `Song.generationStatus`).
 * "ready" → Ready, "pending" → Processing, "failed" → Failed.
 */
export type SongStatus = "ready" | "pending" | "failed";

/**
 * Server-supported smart filters (the `smartFilter` query param). Favorites-only
 * is `"favorites"` — the schema has NO standalone favorite/favoritesOnly param.
 */
export type SongSmartFilter = "this_week" | "unrated" | "most_played" | "favorites";

export interface FetchSongsOptions {
  query?: string;
  cursor?: string | null;
  sortBy?: SongSortBy;
  /** Filter by generation status (server `status` param). */
  status?: SongStatus;
  /** Server `smartFilter` param, e.g. "favorites" for favorites-only. */
  smartFilter?: SongSmartFilter;
  /** Show the archive view instead of the active library (server `archived` bool). */
  archived?: boolean;
}

export async function fetchSongsPage(opts: FetchSongsOptions = {}): Promise<SongPage> {
  const params = new URLSearchParams();
  if (opts.query) params.set("q", opts.query);
  if (opts.cursor) params.set("cursor", opts.cursor);
  if (opts.sortBy && opts.sortBy !== "newest") params.set("sortBy", opts.sortBy);
  if (opts.status) params.set("status", opts.status);
  if (opts.smartFilter) params.set("smartFilter", opts.smartFilter);
  if (opts.archived) params.set("archived", "true");
  const qs = params.toString();
  const res = await apiGet<LibraryResponse>(`/api/songs${qs ? `?${qs}` : ""}`);
  return { songs: unwrapList(res, "songs", mapApiSong), nextCursor: res.nextCursor ?? null };
}

/** Back-compat: first page only, songs array. */
export async function fetchLibrary(query?: string): Promise<Song[]> {
  return (await fetchSongsPage({ query })).songs;
}
