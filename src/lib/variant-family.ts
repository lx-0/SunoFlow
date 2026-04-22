import { prisma } from "@/lib/prisma";

export interface PublicVariant {
  id: string;
  title: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  tags: string | null;
  publicSlug: string | null;
  createdAt: Date;
}

const VARIANT_SELECT = {
  id: true,
  title: true,
  audioUrl: true,
  imageUrl: true,
  duration: true,
  tags: true,
  publicSlug: true,
  createdAt: true,
} as const;

export async function getVariantFamily(
  songId: string,
  parentSongId: string | null
): Promise<PublicVariant[]> {
  let rootId = songId;

  if (parentSongId) {
    rootId = parentSongId;
    let current = await prisma.song.findUnique({
      where: { id: rootId },
      select: { parentSongId: true },
    });
    while (current?.parentSongId) {
      rootId = current.parentSongId;
      current = await prisma.song.findUnique({
        where: { id: rootId },
        select: { parentSongId: true },
      });
    }
  }

  return prisma.song.findMany({
    where: {
      OR: [{ id: rootId }, { parentSongId: rootId }],
      generationStatus: "ready",
      archivedAt: null,
      isHidden: false,
    },
    select: VARIANT_SELECT,
    orderBy: { createdAt: "asc" },
  });
}
