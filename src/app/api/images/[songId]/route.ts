import { prisma } from "@/lib/prisma";
import { imageCache } from "@/lib/cache";
import { fetchFreshUrls, resolveUserApiKey } from "@/lib/sunoapi";
import { logger } from "@/lib/logger";
import { publicRoute } from "@/lib/route-handler";
import { notFound } from "@/lib/api-error";
import { CDN_URL_TTL_MS } from "@/lib/cdn-constants";

export const GET = publicRoute<{ songId: string }>(async (_request, { params }) => {
  const { songId } = params;

  const cached = imageCache.get(songId);
  if (cached) {
    return new Response(new Uint8Array(cached.data), {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Content-Length": String(cached.data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: {
      imageUrl: true,
      imageUrlIsCustom: true,
      isPublic: true,
      sunoJobId: true,
      sunoAudioId: true,
      userId: true,
      parentSong: { select: { sunoJobId: true } },
    },
  });

  if (!song?.imageUrl) {
    return notFound();
  }

  const buf = await imageCache.downloadAndPut(songId, song.imageUrl);
  if (buf) {
    const cachedNow = imageCache.get(songId);
    const contentType = cachedNow?.contentType ?? "image/jpeg";
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buf.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const refreshTaskId = song.parentSong?.sunoJobId ?? song.sunoJobId;
  if (refreshTaskId && !song.imageUrlIsCustom) {
    try {
      const userApiKey = await resolveUserApiKey(song.userId);
      const fresh = await fetchFreshUrls(refreshTaskId, userApiKey, song.sunoAudioId ?? undefined);
      if (fresh?.imageUrl) {
        await prisma.song.update({
          where: { id: songId },
          data: { imageUrl: fresh.imageUrl, imageUrlExpiresAt: new Date(Date.now() + CDN_URL_TTL_MS) },
        });
        const freshBuf = await imageCache.downloadAndPut(songId, fresh.imageUrl);
        if (freshBuf) {
          const ct = imageCache.get(songId)?.contentType ?? "image/jpeg";
          return new Response(new Uint8Array(freshBuf), {
            status: 200,
            headers: {
              "Content-Type": ct,
              "Content-Length": String(freshBuf.length),
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        }
      }
    } catch (err) {
      logger.warn({ songId, err }, "image proxy: refresh attempt failed");
    }
  }

  return notFound();
}, { route: "/api/images/[songId]" });
