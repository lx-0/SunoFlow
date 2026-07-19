import { prisma } from "@/lib/prisma";
import { SongFilters } from "@/lib/songs/filters";
import { ensureDefaultSmartPlaylists } from "./bootstrap";

/**
 * The user's smart playlists, each with a CORRECT song count.
 *
 * The "archive" smart playlist is virtual (backed by `Song.archivedAt`, not
 * materialized PlaylistSong rows), so a join-based `_count` is always 0 for it.
 * We override it with the real archived-song count. This is the single source
 * of the count so web (`/playlists`) and mobile (`/api/smart-playlists`) never
 * diverge — see the archive-is-virtual note in `songs/crud.ts`.
 */
export async function listSmartPlaylistsWithCounts(userId: string) {
  await ensureDefaultSmartPlaylists(userId);

  const [smartPlaylists, archivedCount] = await Promise.all([
    prisma.playlist.findMany({
      where: { userId, isSmartPlaylist: true },
      include: {
        _count: {
          select: { songs: { where: { song: { archivedAt: null } } } },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.song.count({ where: SongFilters.userArchived(userId) }),
  ]);

  return smartPlaylists.map((pl) =>
    pl.smartPlaylistType === "archive"
      ? { ...pl, _count: { ...pl._count, songs: archivedCount } }
      : pl,
  );
}
