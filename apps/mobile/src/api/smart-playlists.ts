import { unwrapList } from "@sunoflow/core";
import { apiGet } from "./client";
import { mapPlaylistSummary, type PlaylistSummary } from "./playlists";

// GET /api/smart-playlists → { playlists: [{ id, name, _count: { songs }, isSmartPlaylist }] }.
// Same row shape as /api/playlists, so we reuse the shared mapper and map defensively.
export async function fetchSmartPlaylists(): Promise<PlaylistSummary[]> {
  const res = await apiGet<unknown>("/api/smart-playlists");
  return unwrapList(res, "playlists", mapPlaylistSummary);
}
