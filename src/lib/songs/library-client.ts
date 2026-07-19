import { apiDelete, apiGet, apiPost } from "@/lib/api-client";

export type LibraryBatchAction =
  | "favorite"
  | "unfavorite"
  | "delete"
  | "restore"
  | "permanent_delete"
  | "make_public"
  | "make_private"
  | "tag"
  | "add_to_playlist";

interface SongsBatchPayload {
  action: LibraryBatchAction;
  songIds: string[];
  tagId?: string;
  playlistId?: string;
}

interface SongsBatchResponse {
  affected?: number;
  error?: string;
}

interface PlaylistsResponse {
  playlists?: Array<{
    id: string;
    name: string;
    isSmartPlaylist?: boolean;
    _count?: { songs?: number };
  }>;
}

export interface LibraryPlaylistOption {
  id: string;
  name: string;
  _count: { songs: number };
}

export interface LibraryPlaylistCreatePayload {
  name: string;
  description?: string;
}

export interface LibraryPlaylist {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { songs: number };
}

interface CreatePlaylistResponse {
  playlist?: LibraryPlaylist;
  error?: string;
}

export async function runSongsBatchAction(
  payload: SongsBatchPayload
): Promise<{ ok: true; affected: number } | { ok: false; error: string }> {
  try {
    const data = await apiPost<SongsBatchResponse>("/api/songs/batch", payload);
    return { ok: true, affected: data.affected ?? payload.songIds.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Batch operation failed";
    return { ok: false, error: msg };
  }
}

export async function fetchPlaylistOptions(): Promise<LibraryPlaylistOption[]> {
  try {
    const data = await apiGet<PlaylistsResponse>("/api/playlists");
    return (data.playlists ?? [])
      // Smart playlists (incl. the virtual Archive) are system-managed and
      // cannot take hand-added songs — never offer them as add targets.
      .filter((pl) => !pl.isSmartPlaylist)
      .map((pl) => ({
        id: pl.id,
        name: pl.name,
        _count: { songs: pl._count?.songs ?? 0 },
      }));
  } catch {
    return [];
  }
}

export async function addSongToPlaylist(
  playlistId: string,
  songId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiPost(`/api/playlists/${playlistId}/songs`, { songId });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to add to playlist";
    return { ok: false, error: msg };
  }
}

export async function createPlaylist(
  payload: LibraryPlaylistCreatePayload
): Promise<{ ok: true; playlist: LibraryPlaylist } | { ok: false; error: string }> {
  try {
    const data = await apiPost<CreatePlaylistResponse>("/api/playlists", payload);
    if (!data.playlist) {
      return { ok: false, error: "Invalid create playlist response" };
    }
    return { ok: true, playlist: data.playlist };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create playlist";
    return { ok: false, error: msg };
  }
}

export async function deletePlaylist(
  playlistId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiDelete(`/api/playlists/${playlistId}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete playlist";
    return { ok: false, error: msg };
  }
}
