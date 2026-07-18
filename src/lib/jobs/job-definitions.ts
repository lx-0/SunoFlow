import { refreshStalePlaylists } from "@/lib/smart-playlists";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { countActiveUsers } from "@/lib/active-users";
import { emailDigestSend } from "@/lib/jobs/email-digest";
import { retentionCleanup } from "@/lib/jobs/retention-cleanup";
import { generateSongEmbeddings } from "@/lib/jobs/generate-embeddings";
import { processAutoGenerateFeeds } from "@/lib/rss/auto-generate";
import { audioCache, imageCache } from "@/lib/cache/file";

import type { JobDefinition } from "@/lib/jobs/types";

async function smartPlaylistRefresh(): Promise<{ refreshed: number; skipped: number }> {
  const { refreshed, skipped } = await refreshStalePlaylists();
  logger.info({ refreshed, skipped }, "jobs: smart-playlist-refresh done");
  return { refreshed, skipped };
}

async function sessionCleanup(): Promise<{ deleted: number }> {
  const { count } = await prisma.session.deleteMany({
    where: { expires: { lt: new Date() } },
  });
  logger.info({ deleted: count }, "jobs: session-cleanup done");
  return { deleted: count };
}

// Rate-limit windows are at most 1h, so anything older than 7d is dead weight.
// `generate` entries are kept (dashboard `/api/dashboard/usage` reads them as a
// lifetime/30d generation history). All other actions — reactions, comments,
// downloads, lyrics_generate, rss_fetch, verification_email — are pure slot
// markers with high cardinality (e.g. `reaction:<songId>`) and need cleanup.
async function rateLimitEntryCleanup(): Promise<{ deletedUser: number; deletedAnon: number }> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { count: userCount } = await prisma.rateLimitEntry.deleteMany({
    where: { createdAt: { lt: cutoff }, action: { not: "generate" } },
  });
  const { count: anonCount } = await prisma.anonRateLimitEntry.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  logger.info(
    { deletedUser: userCount, deletedAnon: anonCount },
    "jobs: rate-limit-cleanup done"
  );
  return { deletedUser: userCount, deletedAnon: anonCount };
}

async function analyticsSnapshot(): Promise<{
  totalUsers: number;
  totalSongs: number;
  generationsLastHour: number;
  activeUsersToday: number;
}> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [totalUsers, totalSongs, generationsLastHour, activeUsersToday] =
    await Promise.all([
      prisma.user.count({ where: { isDisabled: false } }),
      prisma.song.count({ where: { generationStatus: "ready" } }),
      prisma.song.count({ where: { createdAt: { gte: oneHourAgo } } }),
      countActiveUsers(oneDayAgo),
    ]);

  logger.info(
    { totalUsers, totalSongs, generationsLastHour, activeUsersToday },
    "jobs: analytics-aggregation snapshot"
  );
  return { totalUsers, totalSongs, generationsLastHour, activeUsersToday };
}

async function feedAutoGenerate(): Promise<{ processed: number; generated: number }> {
  const { processed, generated } = await processAutoGenerateFeeds();
  logger.info({ processed, generated }, "jobs: feed-auto-generate done");
  return { processed, generated };
}

async function fileCacheEviction(): Promise<{
  audioEvicted: number;
  audioFreedBytes: number;
  imageEvicted: number;
  imageFreedBytes: number;
}> {
  const audio = audioCache.evictToCap();
  const image = imageCache.evictToCap();
  logger.info(
    { audio, image },
    "jobs: file-cache-eviction done"
  );
  return {
    audioEvicted: audio.evicted,
    audioFreedBytes: audio.freedBytes,
    imageEvicted: image.evicted,
    imageFreedBytes: image.freedBytes,
  };
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// expectedMaxAgeMs: /api/health flags a job stale when its latest JobRun is
// older than this. Keep it comfortably above the cron cadence (daily → 26h,
// hourly → 2h) so a deploy window doesn't false-alarm.
export const JOB_DEFINITIONS: JobDefinition[] = [
  { name: "smart-playlist-refresh", cron: "0 3 * * *", run: smartPlaylistRefresh, expectedMaxAgeMs: 26 * HOUR_MS },
  { name: "email-digest-send", cron: "0 8 * * 1", run: emailDigestSend, expectedMaxAgeMs: 8 * DAY_MS },
  { name: "analytics-aggregation", cron: "0 * * * *", run: analyticsSnapshot, expectedMaxAgeMs: 2 * HOUR_MS },
  { name: "session-cleanup", cron: "0 2 * * *", run: sessionCleanup, expectedMaxAgeMs: 26 * HOUR_MS },
  { name: "rate-limit-cleanup", cron: "30 2 * * *", run: rateLimitEntryCleanup, expectedMaxAgeMs: 26 * HOUR_MS },
  { name: "retention-cleanup", cron: "45 2 * * *", run: retentionCleanup, expectedMaxAgeMs: 26 * HOUR_MS },
  // Previously HTTP-cron-only (undocumented Railway dashboard trigger). Now
  // scheduled in-process so they can't silently die with the dashboard state;
  // the /api/cron routes remain as manual-trigger backstops.
  { name: "feed-auto-generate", cron: "5 * * * *", run: feedAutoGenerate, expectedMaxAgeMs: 2 * HOUR_MS },
  { name: "generate-embeddings", cron: "*/15 * * * *", run: generateSongEmbeddings, expectedMaxAgeMs: 1 * HOUR_MS },
  { name: "file-cache-eviction", cron: "15 * * * *", run: fileCacheEviction, expectedMaxAgeMs: 2 * HOUR_MS },
];
