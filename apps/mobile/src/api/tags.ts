import { asNumber, asRecord, asString, unwrapList } from "@sunoflow/core";
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

/** Defensive map of one raw API tag → Tag. Returns null if unusable. */
function mapApiTag(raw: unknown): Tag | null {
  const t = asRecord(raw);
  const id = t ? asString(t.id) : null;
  const name = t ? asString(t.name) : null;
  if (!t || !id || !name) return null;
  return {
    id,
    name,
    color: asString(t.color) ?? undefined,
    songCount: asNumber(asRecord(t._count)?.songTags) ?? undefined,
  };
}

/** List the user's tags (alphabetical, per the web endpoint). */
export async function fetchTags(): Promise<Tag[]> {
  const res = await apiGet<unknown>(`/api/tags`);
  return unwrapList(res, "tags", mapApiTag);
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
  const res = await apiGet<unknown>(`/api/songs?tagId=${encodeURIComponent(tagId)}`);
  return unwrapList(res, "songs", mapApiSong);
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

/** Defensive map of one raw API song-tag → SongTag. Returns null if unusable. */
function mapApiSongTag(raw: unknown): SongTag | null {
  const t = asRecord(raw);
  const id = t ? asString(t.id) : null;
  const name = t ? asString(t.name) : null;
  if (!id || !name) return null;
  return { id, name };
}

/** The tags currently assigned to a song (alphabetical, per the web endpoint). */
export async function fetchSongTags(songId: string): Promise<SongTag[]> {
  const res = await apiGet<unknown>(`/api/songs/${encodeURIComponent(songId)}/tags`);
  return unwrapList(res, "tags", mapApiSongTag);
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
