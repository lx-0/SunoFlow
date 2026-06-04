import { apiGet } from "./client";
import type { PlaylistSummary } from "./playlists";

// GET /api/smart-playlists → { playlists: [{ id, name, _count: { songs }, isSmartPlaylist }] }.
// Same row shape as /api/playlists, so we reuse PlaylistSummary and map defensively.
export async function fetchSmartPlaylists(): Promise<PlaylistSummary[]> {
  const res = await apiGet<{ playlists: unknown[] }>("/api/smart-playlists");
  const list = Array.isArray(res.playlists) ? res.playlists : [];
  return list
    .map((raw): PlaylistSummary | null => {
      if (!raw || typeof raw !== "object") return null;
      const p = raw as Record<string, unknown>;
      if (typeof p.id !== "string") return null;
      const count = (p._count as Record<string, unknown> | undefined)?.songs;
      return {
        id: p.id,
        name: typeof p.name === "string" ? p.name : "Untitled playlist",
        songCount: typeof count === "number" ? count : 0,
      };
    })
    .filter((p): p is PlaylistSummary => p !== null);
}
