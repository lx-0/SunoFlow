import { NextResponse } from "next/server";
import { authRoute, successResponse } from "@/lib/route-handler";
import { requireOwnedSongWithParent } from "@/lib/songs/ownership";
import { notFound } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { resolveUserApiKey } from "@/lib/sunoapi";
import { refreshSongCdnUrls } from "@/lib/songs/asset-refresh";

export const POST = authRoute<{ id: string }>(async (_request, { auth, params }) => {
  const { data: song, error } = await requireOwnedSongWithParent(params.id, auth.userId);
  if (error) return error;

  // Opportunistic heal before counting the play. A null result (no task-id
  // or transient error) still lets playback continue with the existing URL.
  const fresh = await refreshSongCdnUrls(
    {
      id: params.id,
      sunoJobId: song.sunoJobId,
      sunoAudioId: song.sunoAudioId,
      imageUrlIsCustom: song.imageUrlIsCustom,
      parentSunoJobId: song.parentSong?.sunoJobId ?? null,
    },
    { resolveApiKey: () => resolveUserApiKey(auth.userId) },
  );

  const updated = await prisma.song.updateMany({
    where: { id: params.id, userId: auth.userId },
    data: { playCount: { increment: 1 } },
  });

  if (updated.count === 0) {
    return notFound("Song not found");
  }

  if (fresh) {
    return NextResponse.json({ ok: true, audioUrl: fresh.audioUrl });
  }

  return successResponse();
}, { route: "/api/songs/[id]/play" });
