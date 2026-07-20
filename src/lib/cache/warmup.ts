import { prisma } from "@/lib/prisma";
import { audioCache, imageCache } from "./file";
import { resolveUserApiKey } from "@/lib/sunoapi";
import { logger } from "@/lib/logger";
import { CDN_REFRESH_THRESHOLD_MS, isPermanentCdnUrl } from "@/lib/cdn-constants";
import { refreshSongCdnUrls } from "@/lib/songs/asset-refresh";

// Default cap aligned to the audio cache's capacity (2 GB ≈ 400 tracks): there
// is no point warming more songs than the cache can hold. Without a cap an
// unset env var made `take` undefined, so every boot loaded the ENTIRE ready
// catalog and ran a >=1s-per-uncached-song loop for catalog-size seconds on
// each deploy. The env var still overrides when set to a valid positive int.
export const DEFAULT_CACHE_WARMUP_BATCH_SIZE = 400;

function resolveBatchSize(): number {
  const raw = process.env.CACHE_WARMUP_BATCH_SIZE;
  if (raw !== undefined && raw !== "") {
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_CACHE_WARMUP_BATCH_SIZE;
}

const BATCH_SIZE = resolveBatchSize();
const DELAY_MS = 1000;

function isFresh(expiresAt: Date | null, url?: string | null): boolean {
  // Permanent-host (cdn1) URLs never expire — null/stale TTL stamps on those
  // rows are meaningless; without this, every boot re-refreshed ~80% of the
  // catalog against the flaky aggregator (and now would emit a heal event per
  // song — pure noise).
  if (url && isPermanentCdnUrl(url)) return true;
  if (!expiresAt) return false;
  return expiresAt.getTime() - Date.now() > CDN_REFRESH_THRESHOLD_MS;
}

export async function warmUpAudioCache(): Promise<void> {
  const songs = await prisma.song.findMany({
    where: {
      generationStatus: "ready",
      audioUrl: { not: null },
    },
    orderBy: { playCount: "desc" },
    take: BATCH_SIZE,
    select: {
      id: true,
      sunoJobId: true,
      sunoAudioId: true,
      userId: true,
      audioUrl: true,
      audioUrlExpiresAt: true,
      imageUrl: true,
      imageUrlExpiresAt: true,
      imageUrlIsCustom: true,
      parentSong: { select: { sunoJobId: true } },
    },
  });

  const userKeys = new Map<string, string | undefined>();
  let audioCached = 0;
  let audioSkipped = 0;
  let imageCached = 0;
  let imageSkipped = 0;
  let refreshed = 0;
  let failed = 0;

  for (const song of songs) {
    const audioHit = audioCache.has(song.id);
    const imageHit = imageCache.has(song.id);

    if (audioHit) audioSkipped++;
    if (imageHit) imageSkipped++;
    if (audioHit && imageHit) continue;

    let didNetwork = false;

    try {
      // Step 1: try downloading existing DB URLs if still fresh. This avoids
      // a record-info round-trip and works for alternates whose `sunoJobId`
      // is a clip-UUID (record-info would 404).
      if (!audioHit && song.audioUrl && isFresh(song.audioUrlExpiresAt, song.audioUrl)) {
        const ok = await audioCache.downloadAndPut(song.id, song.audioUrl);
        didNetwork = true;
        if (ok) audioCached++;
      }
      if (!imageHit && song.imageUrl && isFresh(song.imageUrlExpiresAt)) {
        const ok = await imageCache.downloadAndPut(song.id, song.imageUrl);
        didNetwork = true;
        if (ok) imageCached++;
      }

      const stillNeedsAudio = !audioHit && !audioCache.has(song.id);
      const stillNeedsImage = !imageHit && !imageCache.has(song.id);

      // Step 2: refresh via the shared asset-heal seam only when direct
      // download didn't suffice. Alternates must use the parent's sunoJobId
      // (true task-id) since the alternate's own sunoJobId is a clip-UUID
      // that record-info rejects.
      const refreshTaskId = song.parentSong?.sunoJobId ?? song.sunoJobId;
      if ((stillNeedsAudio || stillNeedsImage) && refreshTaskId) {
        const fresh = await refreshSongCdnUrls(
          {
            id: song.id,
            sunoJobId: song.sunoJobId,
            sunoAudioId: song.sunoAudioId,
            imageUrlIsCustom: song.imageUrlIsCustom,
            parentSunoJobId: song.parentSong?.sunoJobId ?? null,
          },
          {
            resolveApiKey: async () => {
              if (!userKeys.has(song.userId)) {
                userKeys.set(song.userId, await resolveUserApiKey(song.userId));
              }
              return userKeys.get(song.userId);
            },
          },
        );
        didNetwork = true;
        if (fresh) {
          refreshed++;
          if (stillNeedsAudio && fresh.audioUrl) {
            const ok = await audioCache.downloadAndPut(song.id, fresh.audioUrl);
            if (ok) audioCached++;
            else failed++;
          }
          // fresh.imageUrl is absent for custom covers, so a custom cover is
          // re-warmed from its own URL — never Suno's generated art.
          const coverUrl = fresh.imageUrl ?? song.imageUrl;
          if (stillNeedsImage && coverUrl) {
            const ok = await imageCache.downloadAndPut(song.id, coverUrl);
            if (ok) imageCached++;
          }
        } else if (stillNeedsAudio) {
          failed++;
        }
      } else if (stillNeedsAudio) {
        // No refresh path and direct download didn't help.
        failed++;
      }
    } catch (err) {
      failed++;
      logger.warn({ songId: song.id, err }, "cache-warmup: song failed");
    }

    if (didNetwork) {
      await new Promise<void>((r) => setTimeout(r, DELAY_MS));
    }
  }

  logger.info(
    { total: songs.length, audioCached, audioSkipped, imageCached, imageSkipped, refreshed, failed },
    "cache-warmup: complete",
  );
}
