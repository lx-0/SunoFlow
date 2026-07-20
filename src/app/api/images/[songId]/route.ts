import { prisma } from "@/lib/prisma";
import { resolveUserApiKey } from "@/lib/sunoapi";
import { proxyImage } from "@/lib/images/proxy";
import { optionalAuthRoute } from "@/lib/route-handler";
import { notFound } from "@/lib/api-error";

export const GET = optionalAuthRoute<{ songId: string }>(async (_request, { auth, params }) => {
  const { songId } = params;

  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: {
      imageUrl: true,
      imageUrlIsCustom: true,
      sunoJobId: true,
      sunoAudioId: true,
      userId: true,
      isPublic: true,
      isHidden: true,
      archivedAt: true,
      parentSong: { select: { sunoJobId: true } },
    },
  });

  if (!song) {
    return notFound();
  }

  // Access gate: publicly-discoverable covers are servable to anyone; private,
  // hidden, or archived covers are only servable to their owner.
  const isPubliclyVisible = song.isPublic && !song.isHidden && song.archivedAt === null;
  const isOwner = auth.userId !== null && auth.userId === song.userId;
  if (!isPubliclyVisible && !isOwner) {
    return notFound();
  }

  const served = await proxyImage({
    songId,
    imageUrl: song.imageUrl,
    imageUrlIsCustom: song.imageUrlIsCustom,
    sunoJobId: song.sunoJobId,
    sunoAudioId: song.sunoAudioId,
    parentSunoJobId: song.parentSong?.sunoJobId ?? null,
    resolveApiKey: () => resolveUserApiKey(song.userId),
  });

  return served ?? notFound();
}, { route: "/api/images/[songId]" });
