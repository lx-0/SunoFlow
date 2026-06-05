import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Playable versions of a song: the lineage root plus its ready variations
// (siblings sharing a parentSongId). The server returns rows shaped
// { id, title, audioUrl, imageUrl, duration } — exactly what mapApiSong reads —
// so we reuse the defensive mapper and drop anything unplayable. We still
// normalize the audio field defensively in case a row only exposes streamUrl,
// since this shape is verified statically but not from a live response here.

interface VersionsResponse {
  versions?: unknown[];
}

/** Ensure a raw version row carries `audioUrl` (what mapApiSong expects). */
function normalizeVersionRow(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const r = raw as Record<string, unknown>;
  if (typeof r.audioUrl === "string" && r.audioUrl) return r;
  if (typeof r.streamUrl === "string" && r.streamUrl) {
    return { ...r, audioUrl: r.streamUrl };
  }
  return r;
}

export async function fetchSongVersions(songId: string): Promise<Song[]> {
  const res = await apiGet<VersionsResponse>(`/api/songs/${songId}/playable-versions`);
  if (!Array.isArray(res.versions)) return [];
  return res.versions
    .map(normalizeVersionRow)
    .map(mapApiSong)
    .filter((s): s is Song => s !== null);
}
