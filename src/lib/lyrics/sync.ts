import { prisma } from "@/lib/prisma";
import { Err, type Result, success } from "@/lib/result";
import {
  getTimestampedLyrics,
  resolveUserApiKey,
  SunoApiError,
} from "@/lib/sunoapi";
import { logServerError } from "@/lib/error-logger";
import { logger } from "@/lib/logger";
import { apiCache, cacheKey } from "@/lib/cache";
import { alignWordsToLines, type LineTimestampEntry } from "./align";
import { replaceLyricTimestamps } from "./crud";

export type LyricTimestampSyncSource = "existing" | "synced" | "unavailable";

export interface LyricTimestampSyncResult {
  timestamps: LineTimestampEntry[];
  source: LyricTimestampSyncSource;
}

// The Suno timestamped-lyrics call is billed per request, so a song whose
// alignment came back empty/unusable is not retried for a while.
const UNAVAILABLE_TTL_MS = 6 * 60 * 60 * 1000;

const unavailableCacheKey = (songId: string) =>
  cacheKey("lyric-ts-sync-unavailable", songId);

/**
 * Ensures a song has per-line lyric timestamps, deriving them once from
 * Suno's word-level aligned lyrics when none exist yet. Existing rows
 * (manual taps in the lyrics editor or a prior sync) always win.
 *
 * "unavailable" is a soft outcome — callers fall back to the static
 * lyrics view (uploaded songs, instrumentals, expired upstream tasks).
 */
export async function syncLyricTimestamps(
  songId: string,
  userId: string,
): Promise<Result<LyricTimestampSyncResult>> {
  const song = await prisma.song.findFirst({
    where: { id: songId, userId },
    select: {
      lyrics: true,
      sunoJobId: true,
      sunoAudioId: true,
      parentSong: { select: { sunoJobId: true } },
    },
  });
  if (!song) return Err.notFound("Not found");

  const existing = await prisma.lyricTimestamp.findMany({
    where: { songId },
    orderBy: { lineIndex: "asc" },
    select: { lineIndex: true, startTime: true },
  });
  if (existing.length > 0) {
    return success({ timestamps: existing, source: "existing" as const });
  }

  const unavailable = success({
    timestamps: [] as LineTimestampEntry[],
    source: "unavailable" as const,
  });

  // For alternates the local sunoJobId is a clip-UUID, not a real Suno
  // task-id — upstream lookups must be keyed by the parent's task-id.
  const taskId = song.parentSong?.sunoJobId ?? song.sunoJobId;
  if (!song.lyrics?.trim() || !taskId || !song.sunoAudioId) return unavailable;

  if (apiCache.get(unavailableCacheKey(songId)) !== undefined) {
    return unavailable;
  }

  let alignedWords: unknown;
  try {
    const apiKey = await resolveUserApiKey(userId);
    ({ alignedWords } = await getTimestampedLyrics(
      taskId,
      song.sunoAudioId,
      apiKey,
    ));
  } catch (error) {
    if (error instanceof SunoApiError) {
      // Expected upstream refusals (old task purged, instrumental, rate
      // limit) — not actionable, so no Sentry event.
      logger.warn(
        { songId, taskId, status: error.status, code: error.code },
        "timestamped-lyrics unavailable upstream",
      );
    } else {
      logServerError("lyrics-timestamp-sync", error, {
        userId,
        route: "/api/songs/[id]/lyrics/timestamps/sync",
        params: { songId, sunoJobId: taskId },
      });
    }
    apiCache.set(unavailableCacheKey(songId), true, { ttl: UNAVAILABLE_TTL_MS });
    return unavailable;
  }

  const entries = alignWordsToLines(
    song.lyrics,
    Array.isArray(alignedWords) ? alignedWords : [],
  );
  if (entries.length === 0) {
    apiCache.set(unavailableCacheKey(songId), true, { ttl: UNAVAILABLE_TTL_MS });
    return unavailable;
  }

  const persisted = await replaceLyricTimestamps(songId, userId, entries);
  if (!persisted.ok) return persisted;

  return success({ timestamps: entries, source: "synced" as const });
}
