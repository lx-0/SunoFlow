import { prisma } from "@/lib/prisma";
import { resolveUserApiKey } from "@/lib/sunoapi";
import { proxyImage } from "@/lib/images/proxy";
import { publicRoute } from "@/lib/route-handler";
import { notFound } from "@/lib/api-error";

export const GET = publicRoute<{ songId: string }>(async (_request, { params }) => {
  const { songId } = params;

  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: {
      imageUrl: true,
      imageUrlIsCustom: true,
      sunoJobId: true,
      sunoAudioId: true,
      userId: true,
      parentSong: { select: { sunoJobId: true } },
    },
  });

  if (!song) {
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
