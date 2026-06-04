import { apiGet } from "@/api/client";
import type { Song } from "@/types";

// Full song detail (mirrors the web SongDetailView). GET /api/songs/[id] returns
// { song } with all fields (findUserSong is owner-scoped, include-based). Mapped
// defensively — unknown/missing fields degrade.

export interface SongDetail {
  id: string;
  title: string;
  streamUrl?: string;
  artworkUrl?: string;
  durationSeconds?: number;
  tags: string[];
  model?: string;
  prompt?: string;
  createdAt?: string;
  rating: number | null;
  isFavorite: boolean;
  favoriteCount: number;
}

function toStringTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((t) => {
      if (typeof t === "string") return t;
      if (t && typeof t === "object") {
        const o = t as Record<string, unknown>;
        if (typeof o.name === "string") return o.name;
        const tag = o.tag as Record<string, unknown> | undefined;
        if (tag && typeof tag.name === "string") return tag.name;
      }
      return "";
    })
    .filter((s) => s.length > 0);
}

export async function fetchSongDetail(id: string): Promise<SongDetail> {
  const res = await apiGet<{ song?: unknown }>(`/api/songs/${id}`);
  const s = (res?.song && typeof res.song === "object" ? res.song : {}) as Record<string, unknown>;
  return {
    id: String(s.id ?? id),
    title: typeof s.title === "string" ? s.title : "Untitled",
    streamUrl: typeof s.audioUrl === "string" ? s.audioUrl : undefined,
    artworkUrl: typeof s.imageUrl === "string" ? s.imageUrl : undefined,
    durationSeconds: typeof s.duration === "number" ? s.duration : undefined,
    tags: toStringTags(s.tags),
    model: typeof s.model === "string" ? s.model : undefined,
    prompt: typeof s.prompt === "string" ? s.prompt : undefined,
    createdAt: typeof s.createdAt === "string" ? s.createdAt : undefined,
    rating: typeof s.rating === "number" ? s.rating : null,
    isFavorite: s.isFavorite === true,
    favoriteCount: typeof s.favoriteCount === "number" ? s.favoriteCount : 0,
  };
}

/** Build a playable Song from a detail (null if not playable). */
export function detailToSong(d: SongDetail): Song | null {
  if (!d.streamUrl) return null;
  return {
    id: d.id,
    title: d.title,
    streamUrl: d.streamUrl,
    artworkUrl: d.artworkUrl,
    durationSeconds: d.durationSeconds,
  };
}
