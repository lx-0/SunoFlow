import { requireOwned } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";

export async function requireOwnedSong(songId: string, userId: string) {
  return requireOwned(
    await prisma.song.findUnique({ where: { id: songId } }),
    userId,
    "Song",
  );
}

export async function requireOwnedSongWithParent(songId: string, userId: string) {
  return requireOwned(
    await prisma.song.findUnique({
      where: { id: songId },
      include: { parentSong: { select: { sunoJobId: true } } },
    }),
    userId,
    "Song",
  );
}
