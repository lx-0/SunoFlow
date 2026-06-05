import { createPlaylistBody, reorderPlaylistSongsBody } from "@sunoflow/core";
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

// Mutating playlist actions. Request bodies are built + validated against the
// SHARED @sunoflow/core schemas — the same zod the web routes validate with, so
// the client can't send a body the server would reject for shape reasons.
// Reorder takes the FULL ordered id list; the server also checks length ===
// playlist length, and the detail screen's list drops unplayable rows, so callers
// must handle the resulting HttpError (revert + log), not assume success.

/** PATCH /api/playlists/[id]/reorder { songIds }. Resolves on success, throws otherwise. */
export async function reorderPlaylistSongs(playlistId: string, songIds: string[]): Promise<void> {
  const body = reorderPlaylistSongsBody.parse({ songIds });
  await apiPatch(`/api/playlists/${playlistId}/reorder`, body);
}

/**
 * POST /api/playlists { name }. Server replies 201 with { playlist: { id, ... } }.
 * Read the id defensively (shape may drift) and surface it to the caller.
 */
export async function createPlaylist(name: string): Promise<{ id: string }> {
  const body = createPlaylistBody.parse({ name });
  const res = await apiPost<{ playlist?: { id?: unknown } }>("/api/playlists", body);
  const id = res?.playlist?.id;
  if (typeof id !== "string") {
    throw new Error("Playlist created but response shape was unexpected");
  }
  return { id };
}

/** PATCH /api/playlists/[id] { name }. Resolves on success, throws HttpError otherwise. */
export async function renamePlaylist(id: string, name: string): Promise<void> {
  await apiPatch(`/api/playlists/${id}`, { name });
}

/** DELETE /api/playlists/[id]. Resolves on success, throws HttpError otherwise. */
export async function deletePlaylist(id: string): Promise<void> {
  await apiDelete(`/api/playlists/${id}`);
}

/**
 * POST /api/playlists/[id]/copy. Server replies 201 with the new (private) copy
 * as { playlist: { id, name } }. Read the id defensively (shape may drift) and
 * return it so the caller can navigate to the copy.
 */
export async function copyPlaylist(id: string): Promise<string> {
  const res = await apiPost<{ playlist?: { id?: unknown } }>(`/api/playlists/${id}/copy`, {});
  const newId = res?.playlist?.id;
  if (typeof newId !== "string") {
    throw new Error("Playlist copied but response shape was unexpected");
  }
  return newId;
}

/**
 * GET /api/playlists/[id] → read the current published state (the scalar the
 * publish toggle flips). Defensive: returns false if the field is missing.
 * Mirrors fetchPlaylistCollabMeta's read-from-playlist-scalars approach.
 */
export async function fetchPlaylistPublished(id: string): Promise<boolean> {
  const res = await apiGet<{ playlist?: { isPublished?: unknown } }>(`/api/playlists/${id}`);
  return res?.playlist?.isPublished === true;
}

/**
 * PATCH /api/playlists/[id]/publish — TOGGLES the playlist's published state on
 * the server (it flips `isPublished` itself; the body only carries an optional
 * `genre` applied when publishing). The `isPublic` argument is the caller's
 * intent for readability/labelling — the server derives the actual next state.
 * Resolves on success, throws HttpError otherwise.
 */
export async function setPlaylistPublished(id: string, isPublic: boolean): Promise<void> {
  void isPublic; // intent only — the server flips the published flag itself
  await apiPatch(`/api/playlists/${id}/publish`, {});
}
