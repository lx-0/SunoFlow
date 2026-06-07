import { apiGet, apiPatch } from "@/api/client";
import type { Song } from "@/types";

// Full song detail (mirrors the web SongDetailView). GET /api/songs/[id] returns
// { song } with all fields (findUserSong is owner-scoped, include-based). Mapped
// defensively — unknown/missing fields degrade.

export interface SongDetail {
  id: string;
  title: string;
  streamUrl?: string;
  artworkUrl?: string;
  videoUrl?: string | null;
  durationSeconds?: number;
  tags: string[];
  model?: string;
  prompt?: string;
  createdAt?: string;
  rating: number | null;
  isFavorite: boolean;
  favoriteCount: number;
  publicSlug: string | null;
  isPublic: boolean;
  /** generationStatus (ready | pending | failed | …) — gates Retry. */
  generationStatus: string;
  /** Canonical comma-separated style string (the Suno "style" prompt). */
  tagsString: string;
  /** Suno generation task id — needed to clone a voice persona; null if absent. */
  sunoJobId: string | null;
  /** True for instrumental (no-vocals) generations. */
  isInstrumental: boolean;
  /** Parent song id when this is a variation/extension; null for originals. */
  parentSongId: string | null;
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
    videoUrl: typeof s.videoUrl === "string" ? s.videoUrl : null,
    durationSeconds: typeof s.duration === "number" ? s.duration : undefined,
    tags: toStringTags(s.tags),
    model: typeof s.model === "string" ? s.model : undefined,
    prompt: typeof s.prompt === "string" ? s.prompt : undefined,
    createdAt: typeof s.createdAt === "string" ? s.createdAt : undefined,
    rating: typeof s.rating === "number" ? s.rating : null,
    isFavorite: s.isFavorite === true,
    favoriteCount: typeof s.favoriteCount === "number" ? s.favoriteCount : 0,
    publicSlug: typeof s.publicSlug === "string" ? s.publicSlug : null,
    isPublic: s.isPublic === true,
    generationStatus: typeof s.generationStatus === "string" ? s.generationStatus : "ready",
    tagsString: typeof s.tags === "string" ? s.tags : toStringTags(s.tags).join(", "),
    sunoJobId: typeof s.sunoJobId === "string" ? s.sunoJobId : null,
    isInstrumental: s.isInstrumental === true,
    parentSongId: typeof s.parentSongId === "string" ? s.parentSongId : null,
  };
}

/** Rename a song (PATCH /api/songs/[id] { title }). */
export async function renameSong(id: string, title: string): Promise<void> {
  await apiPatch(`/api/songs/${id}`, { title: title.trim() });
}

/** Toggle a song between public and private (server maps visibility → isPublic). */
export async function setSongVisibility(id: string, visibility: "public" | "private"): Promise<void> {
  await apiPatch(`/api/songs/${id}`, { visibility });
}

/** Build a playable Song from a detail (null if not playable). */
export function detailToSong(d: SongDetail): Song | null {
  if (!d.streamUrl) return null;
  return {
    id: d.id,
    title: d.title,
    streamUrl: d.streamUrl,
    artworkUrl: d.artworkUrl,
    videoUrl: d.videoUrl,
    durationSeconds: d.durationSeconds,
  };
}
