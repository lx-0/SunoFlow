import { asNumber, asRecord, asString, unwrapList } from "@sunoflow/core";
import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Curated public song groups. Shapes confirmed against the web routes:
//   GET /api/collections      → { collections: CollectionSummary[] }
//   GET /api/collections/[id] → { collection: CollectionDetail }
// (resultResponse unwraps to result.data directly). Mapped DEFENSIVELY at the
// boundary — missing/wrong fields degrade gracefully, never throw.

export interface CollectionSummary {
  id: string;
  title: string;
  songCount: number;
  coverUrl?: string;
}

/** Defensive map of one raw collection → list summary. Null if unidentifiable. */
function mapCollection(raw: unknown): CollectionSummary | null {
  const c = asRecord(raw);
  const id = c ? asString(c.id) : null;
  if (!c || !id) return null;
  return {
    id,
    title: asString(c.title) ?? "Untitled",
    songCount: asNumber(c.songCount, 0),
    coverUrl: asString(c.coverImage) ?? undefined,
  };
}

export async function fetchCollections(): Promise<CollectionSummary[]> {
  const res = await apiGet<unknown>("/api/collections");
  return unwrapList(res, "collections", mapCollection);
}

export async function fetchCollectionSongs(id: string): Promise<Song[]> {
  const res = await apiGet<{ collection?: unknown }>(`/api/collections/${encodeURIComponent(id)}`);
  return unwrapList(res?.collection, "songs", mapApiSong);
}
