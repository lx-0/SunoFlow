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
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== "string" || !c.id) return null;
  return {
    id: c.id,
    title: typeof c.title === "string" && c.title ? c.title : "Untitled",
    songCount: typeof c.songCount === "number" ? c.songCount : 0,
    coverUrl: typeof c.coverImage === "string" ? c.coverImage : undefined,
  };
}

export async function fetchCollections(): Promise<CollectionSummary[]> {
  const res = await apiGet<{ collections?: unknown }>("/api/collections");
  const rows = Array.isArray(res.collections) ? res.collections : [];
  return rows.map(mapCollection).filter((c): c is CollectionSummary => c !== null);
}

export async function fetchCollectionSongs(id: string): Promise<Song[]> {
  const res = await apiGet<{ collection?: unknown }>(`/api/collections/${encodeURIComponent(id)}`);
  const detail = res.collection && typeof res.collection === "object" ? (res.collection as Record<string, unknown>) : null;
  const rows = detail && Array.isArray(detail.songs) ? detail.songs : [];
  return rows.map(mapApiSong).filter((s): s is Song => s !== null);
}
