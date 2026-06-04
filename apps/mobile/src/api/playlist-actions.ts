import { apiPatch } from "./client";

// Mutating playlist actions. Reorder takes the FULL ordered id list; the server
// validates length === playlist length. NOTE: the detail screen builds songIds
// from mapApiSong, which DROPS unplayable rows — so a playlist with skipped
// tracks yields a shorter list and the server length check rejects (HttpError).
// Callers must handle that (revert + log), not assume success.

/** PATCH /api/playlists/[id]/reorder { songIds }. Resolves on success, throws HttpError otherwise. */
export async function reorderPlaylistSongs(playlistId: string, songIds: string[]): Promise<void> {
  await apiPatch(`/api/playlists/${playlistId}/reorder`, { songIds });
}
