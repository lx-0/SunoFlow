import { prisma } from "@/lib/prisma";
import { resolveUserApiKey } from "@/lib/sunoapi";
import { proxyAudio } from "@/lib/audio";
import { publicRoute } from "@/lib/route-handler";
import { notFound } from "@/lib/api-error";

export const GET = publicRoute<{ songId: string }>(async (request, { params }) => {
  const { songId } = params;

  const song = await prisma.song.findFirst({
    where: { id: songId, isPublic: true, isHidden: false, archivedAt: null },
    select: {
      audioUrl: true,
      audioUrlExpiresAt: true,
      sunoJobId: true,
      sunoAudioId: true,
      imageUrlIsCustom: true,
      userId: true,
      parentSong: { select: { sunoJobId: true } },
    },
  });

  if (!song?.audioUrl) {
    return notFound();
  }

  return proxyAudio({
    songId,
    audioUrl: song.audioUrl,
    audioUrlExpiresAt: song.audioUrlExpiresAt,
    sunoJobId: song.sunoJobId,
    sunoAudioId: song.sunoAudioId,
    imageUrlIsCustom: song.imageUrlIsCustom,
    parentSunoJobId: song.parentSong?.sunoJobId ?? null,
    resolveApiKey: () => resolveUserApiKey(song.userId),
    rangeHeader: request.headers.get("range"),
    cacheControl: "public",
  });
}, { route: "/api/audio/public/[songId]" });
