import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
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

// --- Global tag management (mirrors the web Settings → Tag Management section) ---
//
// POST   /api/tags        { name } → create a tag (CreateTagBody).
// PATCH  /api/tags/:id     { name } → rename a tag (UpdateTagBody).
// DELETE /api/tags/:id              → delete the tag (removes it from all songs).

/** Create a new tag by name. */
export async function createTag(name: string): Promise<void> {
  await apiPost(`/api/tags`, { name: name.trim() });
}

/** Rename a tag by id. */
export async function renameTag(id: string, name: string): Promise<void> {
  await apiPatch(`/api/tags/${encodeURIComponent(id)}`, { name: name.trim() });
}

/** Delete a tag by id (removes it from every song it was on). */
export async function deleteTag(id: string): Promise<void> {
  await apiDelete(`/api/tags/${encodeURIComponent(id)}`);
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

// --- Per-song tag editing (owner-only on the web; bearer key resolves the user) ---
//
// GET    /api/songs/:id/tags          → { tags: Tag[] }  (full tag rows)
// POST   /api/songs/:id/tags  { name } → creates/assigns the tag to the song
// DELETE /api/songs/:id/tags/:tagId    → unassigns the tag from the song

/** A song's tag, trimmed to the fields the editor needs. */
export interface SongTag {
  id: string;
  name: string;
}

interface SongTagsResponse {
  tags: unknown[];
}

/** Defensive map of one raw API song-tag → SongTag. Returns null if unusable. */
function mapApiSongTag(raw: unknown): SongTag | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const { id, name } = t;
  if (typeof id !== "string" || !id) return null;
  if (typeof name !== "string" || !name) return null;
  return { id, name };
}

/** The tags currently assigned to a song (alphabetical, per the web endpoint). */
export async function fetchSongTags(songId: string): Promise<SongTag[]> {
  const res = await apiGet<SongTagsResponse>(
    `/api/songs/${encodeURIComponent(songId)}/tags`,
  );
  return (Array.isArray(res.tags) ? res.tags : [])
    .map(mapApiSongTag)
    .filter((t): t is SongTag => t !== null);
}

/** Add (create-or-assign) a tag to a song by name. */
export async function addSongTag(songId: string, name: string): Promise<void> {
  await apiPost(`/api/songs/${encodeURIComponent(songId)}/tags`, {
    name: name.trim(),
  });
}

/** Remove a tag from a song by tag id. */
export async function removeSongTag(
  songId: string,
  tagId: string,
): Promise<void> {
  await apiDelete(
    `/api/songs/${encodeURIComponent(songId)}/tags/${encodeURIComponent(tagId)}`,
  );
}
