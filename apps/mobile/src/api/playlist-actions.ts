import { apiDelete, apiPatch, apiPost } from "./client";

// Mutating playlist actions. Reorder takes the FULL ordered id list; the server
// validates length === playlist length. NOTE: the detail screen builds songIds
// from mapApiSong, which DROPS unplayable rows — so a playlist with skipped
// tracks yields a shorter list and the server length check rejects (HttpError).
// Callers must handle that (revert + log), not assume success.

/** PATCH /api/playlists/[id]/reorder { songIds }. Resolves on success, throws HttpError otherwise. */
export async function reorderPlaylistSongs(playlistId: string, songIds: string[]): Promise<void> {
  await apiPatch(`/api/playlists/${playlistId}/reorder`, { songIds });
}

/**
 * POST /api/playlists { name }. Server replies 201 with { playlist: { id, ... } }.
 * Read the id defensively (shape may drift) and surface it to the caller.
 */
export async function createPlaylist(name: string): Promise<{ id: string }> {
  const res = await apiPost<{ playlist?: { id?: unknown } }>("/api/playlists", { name });
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
