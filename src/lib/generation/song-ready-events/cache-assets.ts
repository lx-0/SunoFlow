import { audioCache, imageCache } from "@/lib/cache";
import type { SongReadyContext } from "./types";

/**
 * Download the primary + alternate audio/image into the local file cache so
 * the next playback / cover render does not have to round-trip to Suno's
 * CDN (whose URLs also expire).
 *
 * Per-asset partial failures are isolated — one 404 on an alternate's image
 * must not prevent the primary audio from caching.
 */
export async function cacheSongAssets(ctx: SongReadyContext): Promise<void> {
  const tasks: Array<Promise<unknown>> = [];

  if (ctx.firstSong.audioUrl && !audioCache.has(ctx.song.id)) {
    tasks.push(
      audioCache.downloadAndPut(ctx.song.id, ctx.firstSong.audioUrl).catch(() => undefined),
    );
  }

  const primaryCover = ctx.firstSong.imageUrl || ctx.song.imageUrl;
  if (primaryCover && !imageCache.has(ctx.song.id)) {
    tasks.push(
      imageCache.downloadAndPut(ctx.song.id, primaryCover).catch(() => undefined),
    );
  }

  for (const alt of ctx.alternates) {
    if (alt.audioSource.audioUrl) {
      tasks.push(
        audioCache.downloadAndPut(alt.id, alt.audioSource.audioUrl).catch(() => undefined),
      );
    }
    if (alt.audioSource.imageUrl) {
      tasks.push(
        imageCache.downloadAndPut(alt.id, alt.audioSource.imageUrl).catch(() => undefined),
      );
    }
  }

  await Promise.all(tasks);
}
