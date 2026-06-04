import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Tags talk to the existing web endpoints (authRoute → resolveUser accepts the
// bearer sk- key). GET /api/tags returns { tags } where each tag has id/name/
// color/_count.songTags. Per-tag songs use GET /api/songs?tagId=<id> — the
// library query schema accepts `tagId` and filters the user's songs by it.

export interface Tag {
  id: string;
  name: string;
  color?: string;
  songCount?: number;
}

interface TagsResponse {
  tags: unknown[];
}

interface LibraryResponse {
  songs: unknown[];
  nextCursor: string | null;
  total: number;
}

/** Defensive map of one raw API tag → Tag. Returns null if unusable. */
function mapApiTag(raw: unknown): Tag | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const id = t.id;
  const name = t.name;
  if (typeof id !== "string" || !id) return null;
  if (typeof name !== "string" || !name) return null;
  const count =
    t._count && typeof t._count === "object"
      ? (t._count as Record<string, unknown>).songTags
      : undefined;
  return {
    id,
    name,
    color: typeof t.color === "string" ? t.color : undefined,
    songCount: typeof count === "number" ? count : undefined,
  };
}

/** List the user's tags (alphabetical, per the web endpoint). */
export async function fetchTags(): Promise<Tag[]> {
  const res = await apiGet<TagsResponse>(`/api/tags`);
  return (Array.isArray(res.tags) ? res.tags : [])
    .map(mapApiTag)
    .filter((t): t is Tag => t !== null);
}

/** Songs assigned to a tag, by tag id (server-side filter via ?tagId=). */
export async function fetchSongsByTag(tagId: string): Promise<Song[]> {
  const res = await apiGet<LibraryResponse>(
    `/api/songs?tagId=${encodeURIComponent(tagId)}`,
  );
  return (Array.isArray(res.songs) ? res.songs : [])
    .map(mapApiSong)
    .filter((s): s is Song => s !== null);
}
