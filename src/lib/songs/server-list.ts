import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SongInclude, enrichSongs, type EnrichedSong, type SongWithDetail } from "./projections";

async function listUserSongs(
  userId: string,
  where: Prisma.SongWhereInput,
): Promise<EnrichedSong[]> {
  const songs = await prisma.song.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: SongInclude.detail(userId),
  });
  return enrichSongs(songs as SongWithDetail[]);
}

export async function listLibrarySongs(userId: string): Promise<EnrichedSong[]> {
  return listUserSongs(userId, {
    userId,
    parentSongId: null,
    archivedAt: null,
  });
}

export async function listReadySongs(userId: string): Promise<EnrichedSong[]> {
  return listUserSongs(userId, {
    userId,
    generationStatus: "ready",
  });
}
