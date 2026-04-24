import { prisma } from "@/lib/prisma";
import { downloadAndCache, isCached } from "@/lib/audio-cache";
import { logger } from "@/lib/logger";

const BATCH_SIZE = parseInt(process.env.CACHE_WARMUP_BATCH_SIZE || "100", 10);
const DELAY_MS = 500;

export async function warmUpAudioCache(): Promise<void> {
  const now = new Date();

  const songs = await prisma.song.findMany({
    where: {
      generationStatus: "ready",
      audioUrl: { not: null },
      audioUrlExpiresAt: { gt: now },
    },
    orderBy: { playCount: "desc" },
    take: BATCH_SIZE,
    select: { id: true, audioUrl: true },
  });

  let cached = 0;
  let skipped = 0;
  let failed = 0;

  for (const song of songs) {
    if (isCached(song.id)) {
      skipped++;
      continue;
    }

    const result = await downloadAndCache(song.id, song.audioUrl!);
    if (result) {
      cached++;
    } else {
      failed++;
    }

    await new Promise<void>((r) => setTimeout(r, DELAY_MS));
  }

  logger.info(
    { total: songs.length, cached, skipped, failed },
    "cache-warmup: complete"
  );
}
