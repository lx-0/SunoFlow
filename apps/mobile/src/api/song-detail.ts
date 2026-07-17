import { asBool, asNumber, asRecord, asString } from "@sunoflow/core";
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
      const o = asRecord(t);
      return asString(o?.name) ?? asString(asRecord(o?.tag)?.name) ?? "";
    })
    .filter((s) => s.length > 0);
}

export async function fetchSongDetail(id: string): Promise<SongDetail> {
  const res = await apiGet<{ song?: unknown }>(`/api/songs/${id}`);
  const s = asRecord(res?.song) ?? {};
  return {
    id: String(s.id ?? id),
    title: asString(s.title) ?? "Untitled",
    streamUrl: asString(s.audioUrl) ?? undefined,
    artworkUrl: asString(s.imageUrl) ?? undefined,
    videoUrl: asString(s.videoUrl),
    durationSeconds: asNumber(s.duration) ?? undefined,
    tags: toStringTags(s.tags),
    model: asString(s.model) ?? undefined,
    prompt: asString(s.prompt) ?? undefined,
    createdAt: asString(s.createdAt) ?? undefined,
    rating: asNumber(s.rating),
    isFavorite: asBool(s.isFavorite),
    favoriteCount: asNumber(s.favoriteCount, 0),
    publicSlug: asString(s.publicSlug),
    isPublic: asBool(s.isPublic),
    // Deliberately NOT asString: "" must stay "" (not-ready gating), only a
    // missing/non-string field defaults to "ready".
    generationStatus: typeof s.generationStatus === "string" ? s.generationStatus : "ready",
    tagsString: typeof s.tags === "string" ? s.tags : toStringTags(s.tags).join(", "),
    sunoJobId: asString(s.sunoJobId),
    isInstrumental: asBool(s.isInstrumental),
    parentSongId: asString(s.parentSongId),
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
